const log   = require('loglevel');
const db    = require('../db/db.js');
const sleep = require('../util/sleep.js');

const BlockQueries = require('../db/queries/BlockQueries.js');

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
		this.client.query(BlockQueries.getLatestBlock(this.blockchain_id), (err, result) => {
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
				latest_number = parseInt(result.rows[0].number, 10) + 1;
				log.info("Retrieved latest block:", latest_number);
			}

			this.getBlock(latest_number);
		});
	}

	async getBlock(block_number) {
		this.evmClient.getBlock(block_number, (err, block) => {
			if (err) {
				log.debug("Error:", err);
				sleep(1000);
			}

			// Save the block
			this.client.query(BlockQueries.addBlock(
				this.blockchain_id,
				block.number,
				block.hash,
				block.parentHash,
				block.nonce,
				block.gasLimit,
				block.gasUsed,
				block.timestamp
			), async (err, result) => {
				if (err) {
					client.release();
					log.error('Error executing query', err.stack);
					process.exit(1);
				}

				for (let idx = 0; idx < block.transactions.length; idx++) {
					await this.getTransaction(block.transactions[idx]);
				}

				// Move to the next block
				this.getBlock(parseInt(block.number, 10) + 1);
			});
		});
	}

	async getTransaction(transaction) {
		let receipt = await this.evmClient.getTransactionReceipt(transaction.hash);

		// This is a contract creation
		if (!transaction.to && receipt.contractAddress) {
			log.debug(
				"Contract Address found in block " + 
				transaction.blockNumber + ": " + receipt.contractAddress
			);
		}

		// Add the transaction
		console.log(receipt);

		if (!receipt.logs || !receipt.logs.length) {
			continue;
		}

		/**
		 * Logs contain the signature + all indexed arguments
		 **/
		 /*
		for (let logIdx = 0; logIdx < receipt.logs.length; logIdx++) {
			if (!receipt.logs[logIdx].topics) {
				continue;
			}


		}
		*/
	}
}

module.exports = CacheMonitor;
