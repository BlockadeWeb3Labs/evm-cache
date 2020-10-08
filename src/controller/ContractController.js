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
	constructor() {
		this.stats = {
			'heartbeat_event_insert_count' : 0,
			'heartbeat_event_insert_time' : 0
		};
	}

	setContractCustom(address, custom_data, callback = ()=>{}) {
		let custom_name = null,
			token_uri_json_interface = null,
			token_uri_json_interface_parameters = null,
			custom_token_uri = null,
			custom_token_uri_headers = null;
		if (custom_data && typeof custom_data === 'object') {
			if (custom_data.hasOwnProperty('custom_name')) {
				custom_name = custom_data.custom_name;
			}

			if (custom_data.hasOwnProperty('token_uri_json_interface')) {
				token_uri_json_interface = custom_data.token_uri_json_interface;
			}

			if (custom_data.hasOwnProperty('token_uri_json_interface_parameters')) {
				token_uri_json_interface_parameters = custom_data.token_uri_json_interface_parameters;
			}

			if (custom_data.hasOwnProperty('custom_token_uri')) {
				custom_token_uri = custom_data.custom_token_uri;
			}

			if (custom_data.hasOwnProperty('custom_token_uri_headers')) {
				custom_token_uri_headers = custom_data.custom_token_uri_headers;
			}
		}

		// Set the token URI for this standard
		const ci = new ContractIdentifier();
		ci.getNameSymbol(address, (res) => {
			Database.connect((Client) => {
				// Now allow setting custom data
				Client.query(ContractQueries.updateContractCustomMeta(
					address,
					custom_name || null,
					token_uri_json_interface || res.token_uri_json_interface || null,
					token_uri_json_interface_parameters || null,
					custom_token_uri || null,
					custom_token_uri_headers || null
				), (result) => {
					Client.release();
					callback();
				});
			});
		});
	}

	setContractMetadata(address, abi = null, custom_data = null, callback = ()=>{}) {
		const ci = new ContractIdentifier();
		ci.determineStandard(address, (res) => {
			if (!res.standard) {
				if (abi && typeof abi === 'string' && abi.length > 0) {
					log.info(`Using provided ABI for ${address}`);
				} else if (
					res.call_results.length === 2 &&
					res.call_results.indexOf('erc20') !== -1 &&
					res.call_results.indexOf('erc721') !== -1
				) {
					log.info(`Call results determined ERC-20 and ERC-721 for ${address}, assuming ERC-721.`);
					res.standard = 'erc721';
				} else {
					log.info(`No standard determined for ${address}, and no ABI provided.`);
					return;
				}
			}

			Database.connect((Client) => {
				Client.query(ContractQueries.upsertContractMeta(
					address,
					res.standard,
					abi
				), () => {

					let custom_name = null,
						custom_token_uri = null,
						custom_token_uri_headers = null;
					if (custom_data && typeof custom_data === 'object') {
						if (custom_data.hasOwnProperty('custom_name')) {
							custom_name = custom_data.custom_name;
						}

						if (custom_data.hasOwnProperty('custom_token_uri')) {
							custom_token_uri = custom_data.custom_token_uri;
						}

						if (custom_data.hasOwnProperty('custom_token_uri_headers')) {
							custom_token_uri_headers = custom_data.custom_token_uri_headers;
						}
					}

					// Now get the name and symbol, if available
					ci.getNameSymbol(address, (res) => {
						Client.query(ContractQueries.upsertContractMeta(
							address,
							res.standard,
							abi,
							res.name || null,
							res.symbol || null,
							custom_name || null,
							res.token_uri_json_interface || null,
							custom_token_uri || null,
							custom_token_uri_headers || null
						), (result) => {
							Client.release();
							callback();
						});
					})
				});
			});
		});
	}

	setDecodedLogsByTransaction(transaction_hash, callback = ()=>{}) {
		const lp = new LogParser();
		lp.decodeTransactionLogs(transaction_hash, (events) => {
			if (!events.events || !Object.keys(events.events).length) {
				log.debug(`No events returned for transaction ${transaction_hash}`);
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

	async setDecodedLog(Client, log_id, logReceipt) {
		let contractMetaRes = await Client.query(ContractQueries.getContractMeta(logReceipt.address));

		// If the contract meta record does not exist, move along
		if (!contractMetaRes || !contractMetaRes.rowCount || !contractMetaRes.rows[0].contract_meta_id) {
			return;
		}

		// Decode these logs
		const lp = new LogParser();
		let events = lp.decodeLogs([{
			...logReceipt,
			log_id,
			'standard' : contractMetaRes.rows[0].standard,
			'abi'      : contractMetaRes.rows[0].abi
		}]);

		if (!events || !Object.keys(events).length) {
			return;
		}

		log.info(`Found ${Object.keys(events).length} log events for ${logReceipt.address}`);

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
	}

	async insertEvent(Client, log_id, contract_address, name, result) {
		// Drop pre-existing events
		await Client.query(EventQueries.deleteLogEvents(log_id));

		// Insert the events again
		let res = await Client.query(EventQueries.insertEvent(
			log_id,
			name,
			result
		));

		if (!res || !res.rowCount) {
			log.debug(`Could not add event per log ${log_id}`);
			return;
		}

		this.stats.heartbeat_event_insert_count++;

		// Add transfer events to a dedicated log
		if (name === 'Transfer') {
			let event_id = res.rows[0].event_id;

			await Client.query(EventQueries.insertEventTransfer(
				event_id,
				contract_address,
				result.to      || result._to,
				result.from    || result._from,
				result.tokenId || result._tokenId,
				result.value   || result._value
			));
		} else if (name === 'TransferSingle') {
			let event_id = res.rows[0].event_id;

			await Client.query(EventQueries.insertEventTransfer(
				event_id,
				contract_address,
				result._to,
				result._from,
				result._id,
				result.hasOwnProperty('_amount') ? result._amount : result._value
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
					result.hasOwnProperty('_amounts') ? result._amounts[idx] : result._values[idx]
				));
			}
		}
	}

	backfillContractLogsByLogs(blockchain_id, address, log_limit, start_override, callback = ()=>{}) {
		let latest_log_number = 0;

		Database.connect(async (Client) => {

			// Kick it off
			Client.query(TransactionQueries.getMaxLog(), (result) => {
				if (!result.rowCount) {
					log.error(`Unable to return max log`);
					process.exit(1);
				}

				latest_log_number = parseInt(result.rows[0].max, 10);
				log.info(`Latest log ID found: ${latest_log_number}`);

				getContractMeta.call(this);
			});

			let contractMetaSet = false;
			async function getContractMeta() {
				Client.query(ContractQueries.getContractMeta(address), (result) => {
					// No recent event found
					if (!result.rowCount || !result.rows[0].contract_meta_id) {
						if (contractMetaSet) {
							Client.release();
							console.error(`Trying to set contract standard multiple times for ${address}`);
							process.exit(1);
						}

						// Need to add the contract
						contractMetaSet = true;
						this.setContractMetadata(address, null, null, getContractMeta.bind(this));
					} else {
						getMostRecentContractLog.call(this, result.rows[0]);
					}
				});
			}

			async function getMostRecentContractLog(meta) {
				let start_log,
					end_log;

				// Start at the beginning
				start_log = 1;

				// If we have an override
				if (start_override && parseInt(start_override, 10) >= 0) {
					start_log = parseInt(start_override, 10);
				}

				end_log = start_log + log_limit;

				// Get the lowest Log ID for this block
				let res = await Client.query(TransactionQueries.getBlockNumberForTransactionLog(start_log));
				let block_number = (res && res.rowCount && res.rows[0].number) || -1;

				log.info(`Starting contract backfill on block ${block_number} at log ${start_log}`);
				this.stats.heartbeat_event_insert_time = Date.now()/1000;

				backfill.call(this, address, start_log, end_log);
			};

			let heartbeat_count = 0;
			async function backfill(address, start_log, end_log) {
				Client.query(TransactionQueries.getTransactionLogsByContractInLogRange(
					address,
					start_log,
					end_log
				), async (result) => {
					if (start_log >= latest_log_number) {
						let res = await Client.query(TransactionQueries.getBlockNumberForTransactionLog(latest_log_number));
						let block_number = (res && res.rowCount && res.rows[0].number) || -1;

						log.info(`Reached end at block ${block_number}, between logs ${start_log} to ${end_log}: ${this.stats.heartbeat_event_insert_count} events added in ${(Date.now()/1000-this.stats.heartbeat_event_insert_time).toLocaleString(5)} seconds`);
						Client.release();
						return callback();
					}

					start_log = end_log;
					end_log = start_log + log_limit;

					if (heartbeat_count++ % 40 === 0) {
						let res = await Client.query(TransactionQueries.getBlockNumberForTransactionLog(start_log));
						let block_number = (res && res.rowCount && res.rows[0].number) || -1;

						log.info(`Heartbeat at block ${block_number}, between logs ${start_log} to ${end_log}: ${this.stats.heartbeat_event_insert_count} events added in ${(Date.now()/1000-this.stats.heartbeat_event_insert_time).toLocaleString(5)} seconds -- at ${(start_log/latest_log_number*100).toLocaleString(2)}%`);
						this.stats.heartbeat_event_insert_count = 0;
						this.stats.heartbeat_event_insert_time = Date.now()/1000;
					}

					if (!result.rowCount) {
						return backfill.call(this, address, start_log, end_log);
					}

					// Decode these logs
					const lp = new LogParser();
					let events = lp.decodeLogs(result.rows);

					if (!events || !Object.keys(events).length) {
						return backfill.call(this, address, start_log, end_log);
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

					return backfill.call(this, address, start_log, end_log);

				});
			};
		});
	}
}

module.exports = ContractController;
