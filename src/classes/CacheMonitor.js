const log   = require('loglevel');
const db    = require('../db/db.js');
const sleep = require('../util/sleep.js');

const BlockQueries = require('../db/queries/BlockQueries.js');
const TransactionQueries = require('../db/queries/TransactionQueries.js');
const ContractQueries = require('../db/queries/ContractQueries.js');

class CacheMonitor {
	constructor(blockchain_id, client) {
		this.blockchain_id = blockchain_id;
		this.evmClient = client;
		this.client = null; // Covered in start()
	}

	async start() {
		let pool = db.getPool();
		this.client = await pool.connect();

		if (!this.client) {
			log.error('Error acquiring client');
			process.exit(1);
		}

		// Determine where to start
		this.client.query(BlockQueries.getLatestBlock(this.blockchain_id), async (err, result) => {
			if (err) {
				this.client.release();
				log.error('Error executing query', err.stack);
				process.exit(1);
			}

			let latest_number;
			if (!result || !result.rowCount) {
				latest_number = 0;
				log.info("No latest block, starting at 0");
			} else {
				// Rerun the current latest number - see truncate below
				latest_number = parseInt(result.rows[0].number, 10);
				log.info("Retrieved latest block:", latest_number);
			}

			// First we're going to truncate everything related to the current block
			// so we can stop and start without missing data in-between
			await this.flushBlock(latest_number);

			this.getBlock(latest_number);
		});
	}

	async flushBlock(block_number) {
		log.info("Flushing", block_number);

		await this.client.query(TransactionQueries.deleteLogs(
			this.blockchain_id,
			block_number
		));

		log.info("Logs deleted");

		await this.client.query(TransactionQueries.deleteTransactions(
			this.blockchain_id,
			block_number
		));

		log.info("Transactions deleted");

		await this.client.query(BlockQueries.deleteOmmers(
			this.blockchain_id,
			block_number
		));

		log.info("Ommers deleted");

		await this.client.query(BlockQueries.deleteBlock(
			this.blockchain_id,
			block_number
		));

		log.info("Completed flushing", block_number);
	}

	async getBlock(block_number) {
		this.evmClient.getBlock(block_number, async (err, block) => {
			if (err) {
				log.error("Error:", err);
				process.exit(1);
			} else if (!block) {
				log.debug("No block found:", block_number);

				// Release the client for a bit
				this.client.release();
				await sleep(5000);
				let pool = db.getPool();
				this.client = await pool.connect();

				if (!this.client) {
					log.error('Error acquiring client');
					process.exit(1);
				}

				// Try this block again
				return this.getBlock(parseInt(block_number, 10));
			}

			log.info(`At block #${block.number}`);

			// Save the block
			this.client.query(BlockQueries.addBlock(
				this.blockchain_id,
				block.number,
				block.hash,
				block.parentHash,
				block.nonce,
				block.gasLimit,
				block.gasUsed,
				block.timestamp,
				block.sha3Uncles,
				block.logsBloom,
				block.transactionsRoot,
				block.receiptsRoot,
				block.stateRoot,
				block.mixHash,
				block.miner,
				block.difficulty,
				block.extraData,
				block.size
			), async (err, result) => {
				if (err) {
					this.client.release();
					log.error('Error executing query', err.stack);
					process.exit(1);
				}

				if (!result || !result.rowCount) {
					this.client.release();
					log.error('No result returned for');
					log.error(block);
					log.error('^^ No result returned ^^');
					process.exit(1);
				}

				// Get the database record block ID
				let block_id = result.rows[0].block_id;

				// Queue up all of the tasks
				let promises = [];

				// Insert any ommers
				if (block.uncles && block.uncles.length) {
					promises.push(this.addOmmers(block_id, block.uncles));
				}

				for (let idx = 0; idx < block.transactions.length; idx++) {
					promises.push(this.getTransaction(block_id, block.transactions[idx]));
				}

				Promise.all(promises).then(values => {
					// Move to the next block
					this.getBlock(parseInt(block.number, 10) + 1);
				}).catch(error => {
					log.error('Promises failed for retrieving all block data');
					log.error('Error:');
					log.error(error);
					log.error('Error Message:');
					log.error(error.message);
					process.exit(1);
				});
			});
		});
	}

	async addOmmers(nibling_block_id, ommers) {
		let promises = [];

		for (let idx = 0; idx < ommers.length; idx++) {
			promises.push(
				this.client.query(BlockQueries.addOmmer(
					this.blockchain_id,
					ommers[idx],
					nibling_block_id
				))
			);
		}

		return Promise.all(promises);
	}

	async getTransaction(block_id, transaction) {
		let receipt = await this.evmClient.getTransactionReceipt(transaction.hash);

		// This is a contract creation
		if (!transaction.to && receipt.contractAddress) {
			log.debug(
				"Contract Address found in block " + 
				transaction.blockNumber + ": " + receipt.contractAddress
			);

			await this.client.query(ContractQueries.addContract(
				this.blockchain_id,
				receipt.contractAddress,
				null,
				null
			));
		}

		// Add the transaction
		let result = await this.client.query(TransactionQueries.addTransaction(
			block_id,
			transaction.hash,
			transaction.nonce,
			transaction.transactionIndex,
			transaction.from,
			transaction.to,
			transaction.value,
			transaction.gasPrice,
			transaction.gas,
			transaction.input,
			receipt.status || null,
			receipt.contractAddress || null,
			transaction.v,
			transaction.r,
			transaction.s
		));

		if (!result || !result.rowCount) {
			this.client.release();
			log.error('No result returned for');
			log.error(transaction);
			log.error('^^ No result returned in block ' + block_id + ' ^^');
			process.exit(1);
		}

		// Get the database identifier for transaction ID
		let transaction_id = result.rows[0].transaction_id;

		if (!receipt.logs || !receipt.logs.length) {
			return;
		}

		// Add the logs
		for (let idx = 0; idx < receipt.logs.length; idx++) {
			await this.client.query(TransactionQueries.addLog(
				transaction_id,
				receipt.logs[idx].logIndex,
				receipt.logs[idx].address,
				receipt.logs[idx].data,
				...receipt.logs[idx].topics
			));
		}
	}
}

module.exports = CacheMonitor;
