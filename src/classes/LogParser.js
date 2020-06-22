const log = require('loglevel');
const Web3 = require('web3');
const abiCfg = require('../config/abi.js');
const Database = require('../database/Database.js');
const TransactionQueries = require('../database/queries/TransactionQueries.js');
const ContractQueries = require('../database/queries/ContractQueries.js');
const byteaBufferToHex = require('../util/byteaBufferToHex.js');

class LogParser {
	constructor() {
		this.web3 = new Web3();
	}

	async decodeTransactionLogs(hash, callback = ()=>{}) {
		Database.connect((Client) => {
			Client.query(TransactionQueries.getTransactionLogs(hash), async (result) => {
				Client.release();

				if (!result.rowCount) {
					log.error(`Transaction ${hash} does not have logs stored in the database.`);
					return false;
				}

				let events = await this.decodeLogs(result.rows);

				callback({
					hash,
					events
				});
			});
		});
	}

	async decodeLogs(logs) {
		let Client = await Database.connect();

		let decodedLogs = {};
		for (let txLog of logs) {
			let address = byteaBufferToHex(txLog.address);
			let result = await Client.query(ContractQueries.getContractMeta(address));

			if (!result.rowCount || !result.rows[0].standard) {
				log.error(`Contract meta for ${address} not found in the database.`);
				return false;
			}

			let standard = result.rows[0].standard;
			let event = this.decodeLog(standard, byteaBufferToHex(txLog.data), this.pullTopics(txLog));
			decodedLogs[txLog.log_id] = event;
		}

		Client.release();

		return decodedLogs;
	}

	pullTopics(txLog) {
		let topics = [];
		if (txLog.topic_0) topics.push(byteaBufferToHex(txLog.topic_0));
		if (txLog.topic_1) topics.push(byteaBufferToHex(txLog.topic_1));
		if (txLog.topic_2) topics.push(byteaBufferToHex(txLog.topic_2));
		if (txLog.topic_3) topics.push(byteaBufferToHex(txLog.topic_3));
		return topics;
	}

	decodeLog(standardOrAbi, data, topics) {
		let signatures = {}, abi = {};
		if (typeof standardOrAbi === 'string') {
			// Standard
			signatures = abiCfg.eventSignatures[standardOrAbi];
			abi = abiCfg.abis[standardOrAbi];
		} else if (typeof standardOrAbi === 'object') {
			// ABI
			signatures = {};
		}

		// Determine the topic we're dealing with
		for (let event in signatures) {
			if (!signatures.hasOwnProperty(event)) continue;
			if (topics.indexOf(signatures[event]) !== -1) {
				//log.info(`Identified event: ${event}`);

				let json = abiCfg.getEventJson(abi, event);
				let inputs = json.inputs;

				// Remove topics[0] from non-anonymous events
				// https://web3js.readthedocs.io/en/v1.2.0/web3-eth-abi.html#decodelog
				if (json.anonymous === false) {
					topics.shift();
				}

				try {
					return this.web3.eth.abi.decodeLog(inputs, data, topics);
				} catch (ex) {
					log.error(`Exception at decoding log, expected event: ${event}`);
					return;
				}
			}
		}
	}

}

module.exports = LogParser;
