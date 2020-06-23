const log = require('loglevel');
const Database = require('../database/Database.js');
const sleep = require('../util/sleep.js');

const BlockQueries = require('../database/queries/BlockQueries.js');
const TransactionQueries = require('../database/queries/TransactionQueries.js');

class CacheMonitor {
	constructor(options) {
		this.blockchain_id = options.blockchain_id;
		this.evmClient = options.client;
		this.startBlockOverride = options.startBlockOverride;
		this.endBlockOverride = options.endBlockOverride;
		this.Client = null; // Covered in start()
	}

	async start() {
		Database.connect((Client) => {
			Client.query(BlockQueries.getLatestBlock(this.blockchain_id), async (result) => {
				this.Client = Client;

				let latest_number;
				if (this.startBlockOverride !== false) {
					latest_number = this.startBlockOverride;
					log.info("Using start block number override:", latest_number);
				} else if (!result || !result.rowCount) {
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
		});
	}

	async flushBlock(block_number) {
		log.info("Flushing", block_number);

		await this.Client.query(TransactionQueries.deleteLogs(
			this.blockchain_id,
			block_number
		));

		log.info("Logs deleted");

		await this.Client.query(TransactionQueries.deleteTransactions(
			this.blockchain_id,
			block_number
		));

		log.info("Transactions deleted");

		await this.Client.query(BlockQueries.deleteOmmers(
			this.blockchain_id,
			block_number
		));

		log.info("Ommers deleted");

		await this.Client.query(BlockQueries.deleteBlock(
			this.blockchain_id,
			block_number
		));

		log.info("Completed flushing", block_number);
	}

	async getBlock(block_number) {
		if (this.endBlockOverride !== false && block_number >= this.endBlockOverride) {
			log.info("Reached endBlockOverride:", this.endBlockOverride);
			process.exit();
		}

		this.evmClient.getBlock(block_number, async (err, block) => {
			if (err) {
				log.error("Error:", err);
				process.exit(1);
			} else if (!block) {
				log.debug("No block found:", block_number);

				// Release the client for a bit
				this.Client.release();

				// Wait before checking for the next block
				await sleep(5000);

				Database.connect((Client) => {
					Client.query(BlockQueries.getLatestBlock(this.blockchain_id), async (result) => {
						this.Client = Client;

						// Try this block again
						return this.getBlock(parseInt(block_number, 10));
					});
				});

				return;
			}

			log.info(`At block #${block.number}`);

			// Save the block
			this.Client.query(BlockQueries.addBlock(
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
			), async (result) => {
				if (!result || !result.rowCount) {
					this.Client.release();
					log.error('No result returned for');
					log.error(block);
					log.error('^^ No result returned ^^');
					process.exit(1);
				}

				// Queue up all of the tasks
				let promises = [];

				// Use a transaction for all of the promises
				await this.Client.query('BEGIN;');

				// Insert any ommers
				if (block.uncles && block.uncles.length) {
					promises.push(this.addOmmers(block.hash, block.uncles));
				}

				for (let idx = 0; idx < block.transactions.length; idx++) {
					promises.push(this.getTransaction(block.hash, block.transactions[idx]));
				}

				Promise.all(promises).then(async values => {
					// Commit the transaction for all of the promises
					await this.Client.query('COMMIT;');

					// Move to the next block
					this.getBlock(parseInt(block.number, 10) + 1);
				}).catch(async error => {
					// Rollback the transaction for all of the promises
					await this.Client.query('ROLLBACK;');

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

	async addOmmers(nibling_block_hash, ommers) {
		let promises = [];

		for (let idx = 0; idx < ommers.length; idx++) {
			promises.push(
				this.Client.query(BlockQueries.addOmmer(
					this.blockchain_id,
					ommers[idx],
					nibling_block_hash
				))
			);
		}

		return Promise.all(promises);
	}

	async getTransaction(block_hash, transaction) {
		let receipt = await this.evmClient.getTransactionReceipt(transaction.hash);

		// Add the transaction
		let result = await this.Client.query(TransactionQueries.addTransaction(
			block_hash,
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
			this.Client.release();
			log.error('No result returned for');
			log.error(transaction);
			log.error('^^ No result returned in block ' + block_hash + ' ^^');
			process.exit(1);
		}

		if (!receipt.logs || !receipt.logs.length) {
			return;
		}

		// Add the logs
		for (let idx = 0; idx < receipt.logs.length; idx++) {
			await this.Client.query(TransactionQueries.addLog(
				transaction.hash,
				receipt.logs[idx].logIndex,
				receipt.logs[idx].address,
				receipt.logs[idx].data,
				...receipt.logs[idx].topics
			));
		}
	}
}

module.exports = CacheMonitor;
