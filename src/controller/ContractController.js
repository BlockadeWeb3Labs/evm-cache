const log = require('loglevel');
const Web3 = require('web3');
const abiCfg = require('../config/abi.js');
const Database = require('../database/Database.js');
const BlockQueries = require('../database/queries/BlockQueries.js');
const TransactionQueries = require('../database/queries/TransactionQueries.js');
const ContractQueries = require('../database/queries/ContractQueries.js');
const EventQueries = require('../database/queries/EventQueries.js');
const byteaBufferToHex = require('../util/byteaBufferToHex.js');
const ContractIdentifier = require('../classes/ContractIdentifier.js');
const LogParser = require(__dirname + '/../classes/LogParser.js');

class ContractController {
	constructor() {}

	setStandard(address, callback = ()=>{}) {
		const ci = new ContractIdentifier();
		ci.determineStandard(address, (res) => {
			if (!res.standard) {
				log.info(`No standard determined for ${address}`);
				return;
			}

			Database.connect((Client) => {
				Client.query(ContractQueries.upsertContractMeta(
					address,
					res.standard
				), (result) => {
					Client.release();
					callback();
				});
			});
		});
	}

	setDecodedLogs(transaction_hash, callback = ()=>{}) {
		const lp = new LogParser();
		lp.decodeTransactionLogs(transaction_hash, (events) => {
			if (!events.events || !Object.keys(events.events).length) {
				log.info(`No events returned for transaction ${transaction_hash}`);
				return;
			}

			Database.connect(async (Client) => {
				for (let log_id in events.events) {
					if (!events.events.hasOwnProperty(log_id)) continue;

					await this.insertEvent(
						Client,
						log_id,
						events.events[log_id].contract_address,
						events.events[log_id].name,
						events.events[log_id].result
					);
				}

				Client.release();
				callback();
			});
		});
	}

	async insertEvent(Client, log_id, contract_address, name, result) {
		let res = await Client.query(EventQueries.insertEvent(
			log_id,
			name,
			result
		));

		if (!res || !res.rowCount) {
			log.error(`Could not add event per log ${log_id}`);
			process.exit(1);
		}

		// Add transfer events to a dedicated log
		if (name === 'Transfer') {
			let event_id = res.rows[0].event_id;

			await Client.query(EventQueries.insertEventTransfer(
				event_id,
				contract_address,
				result.to,
				result.from,
				result.tokenId,
				result.value
			));
		} else if (name === 'TransferSingle') {
			let event_id = res.rows[0].event_id;

			await Client.query(EventQueries.insertEventTransfer(
				event_id,
				contract_address,
				result._to,
				result._from,
				result._id,
				result._amount
			));
		} else if (name === 'TransferBatch') {
			let event_id = res.rows[0].event_id;

			for (let idx = 0; idx < result._ids.length; idx++) {
				await Client.query(EventQueries.insertEventTransfer(
					event_id,
					contract_address,
					result._to,
					result._from,
					result._ids[idx],
					result._amounts[idx]
				));
		    }
		}
	}

	backfillContractLogs(blockchain_id, address, block_limit, callback = ()=>{}) {
		let latest_block_number = 0;

		Database.connect(async (Client) => {

			// Kick it off
			Client.query(BlockQueries.getLatestBlock(blockchain_id), (result) => {
				if (!result.rowCount) {
					log.error(`Unable to return latest block`);
					process.exit(1);
				}

				latest_block_number = parseInt(result.rows[0].number, 10);
				log.info(`Latest block found: ${latest_block_number}`);

				getContractMeta.call(this);
			});

			let ranSetStandard = false;
			async function getContractMeta() {
				Client.query(ContractQueries.getContractMeta(address), (result) => {
					// No recent event found
					if (!result.rowCount || !result.rows[0].contract_meta_id) {
						if (ranSetStandard) {
							Client.release();
							console.error(`Trying to set contract standard multiple times for ${address}`);
							process.exit(1);
						}

						// Need to add the contract
						ranSetStandard = true;
						this.setStandard(address, getContractMeta.bind(this));
					} else {
						getMostRecentContractEvent.call(this, result.rows[0]);
					}
				});
			}

			async function getMostRecentContractEvent(meta) {
				Client.query(EventQueries.getMostRecentContractEvent(address), async (result) => {
					let start_block,
						end_block;

					// No recent event found
					if (!result.rowCount) {
						start_block = parseInt(meta.created_block, 10);
					} else {
						start_block = parseInt(result.rows[0].block_number, 10);
					}

					end_block = start_block + block_limit;

					log.info(`Starting contract backfill on block ${start_block}`);

					backfill.call(this, address, start_block, end_block);
				});
			};

			let heartbeat_count = 0;
			async function backfill(address, start_block, end_block) {
				Client.query(TransactionQueries.getTransactionLogsByContract(
					address,
					start_block,
					end_block
				), async (result) => {
					if (start_block >= latest_block_number) {
						Client.release();
						return callback();
					}

					start_block = end_block;
					end_block = start_block + block_limit;

					if (heartbeat_count++ % 20 === 0) {
						log.info(`Heartbeat between blocks ${start_block} to ${end_block}`);
					}

					if (!result.rowCount) {
						return backfill.call(this, address, start_block, end_block);
					}

					// Decode these logs
					const lp = new LogParser();
					let events = lp.decodeLogs(result.rows);

					if (!events || !Object.keys(events).length) {
						return backfill.call(this, address, start_block, end_block);
					}

					for (let log_id in events) {
						if (!events.hasOwnProperty(log_id)) continue;

						await this.insertEvent(
							Client,
							log_id,
							events[log_id].contract_address,
							events[log_id].name,
							events[log_id].result
						);
					}

					return backfill.call(this, address, start_block, end_block);

				});
			};
		});
	}
}

module.exports = ContractController;
