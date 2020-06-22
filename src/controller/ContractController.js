const log = require('loglevel');
const Web3 = require('web3');
const abiCfg = require('../config/abi.js');
const Database = require('../database/Database.js');
const ContractQueries = require('../database/queries/ContractQueries.js');
const byteaBufferToHex = require('../util/byteaBufferToHex.js');
const ContractIdentifier = require('../classes/ContractIdentifier.js');

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

	
}

module.exports = ContractController;
