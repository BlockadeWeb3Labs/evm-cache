const log = require('loglevel');
const Web3 = require('web3');
const abiCfg = require('../config/abi.js');
const Database = require('../database/Database.js');
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

					await Client.query(EventQueries.insertEvent(
						log_id,
						events.events[log_id].name,
						events.events[log_id].result
					));
				}

				Client.release();
				callback();
			});
		});
	}
}

module.exports = ContractController;
