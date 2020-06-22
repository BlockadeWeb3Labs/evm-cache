const log = require('loglevel');
const Web3 = require('web3');
const abiCfg = require('../config/abi.js');
const Database = require('../database/Database.js');
const ContractQueries = require('../database/queries/ContractQueries.js');
const byteaBufferToHex = require('../util/byteaBufferToHex.js');

class ContractIdentifier {
	constructor() {
		this.web3 = new Web3();
	}

	async determineStandard(address, callback = ()=>{}) {
		Database.connect((Client) => {
			Client.query(ContractQueries.getContractCode(address), async (result) => {
				Client.release();

				if (!result.rowCount || !result.rows[0].input) {
					log.error(`Address ${address} does not have contract creation transaction stored in the database.`);
					return false;
				}

				let code = byteaBufferToHex(result.rows[0].input);

				// Try to figure out the standard from the ABI
				let code_results = this.determineStandardByCode(code, false);

				// If one of these passed, then hand it back
				let standard = null;
				if (code_results.length === 1) {
					standard = code_results[0];
				} else if (code_results.length > 1) {
					log.error(`Ambiguous code analysis result for ${address}, returned ${code_results}`);
					return false;
				}

				// Failing? Try to guess the standard by calling the contract
				let call_results = await this.determineStandardByCall(address, false);

				callback({
					address,
					code_results,
					call_results,
					standard
				});
			});
		});
	}

	determineStandardByCode(input, verbose = false) {
		// Strictly lowercase comparisons
		input = input.toLowerCase();

		const abis = abiCfg.abis;
		const requiredEvents = abiCfg.events;
		const requiredFunctions = abiCfg.functions;

		// Keep track of potential matches
		let matches = abiCfg.contracts.slice();

		// Find a matching standard by function
		for (let contractType in requiredFunctions) {
			if (!requiredFunctions.hasOwnProperty(contractType)) continue;
			if (matches.indexOf(contractType) === -1) continue;

			contract_standard:
			for (let fIdx = 0; fIdx < requiredFunctions[contractType].length; fIdx++) {
				// Find the part of the ABI we want
				for (let idx = 0; idx < abis[contractType].length; idx++) {
					if (abis[contractType][idx].type !== 'function') continue;
					if (abis[contractType][idx].name !== requiredFunctions[contractType][fIdx]) continue;

					let sig = this.web3.eth.abi.encodeFunctionSignature(abis[contractType][idx]);
					sig = sig.slice(2).toLowerCase(); // Remove 0x and force lowercase jic

					if (input.indexOf(sig) === -1) {
						verbose && log.debug(contractType + " function: " + abis[contractType][idx].name, ": NOT FOUND");
						matches.splice(matches.indexOf(contractType), 1);
						break contract_standard;
					} else {
						verbose && log.debug(contractType + " function: " + abis[contractType][idx].name, ": FOUND");
					}
				}
			}
		}

		// Find a matching standard by event
		for (let contractType in requiredEvents) {
			if (!requiredEvents.hasOwnProperty(contractType)) continue;
			if (matches.indexOf(contractType) === -1) continue;

			contract_standard:
			for (let fIdx = 0; fIdx < requiredEvents[contractType].length; fIdx++) {
				// Find the part of the ABI we want
				for (let idx = 0; idx < abis[contractType].length; idx++) {
					if (abis[contractType][idx].type !== 'event') continue;
					if (abis[contractType][idx].name !== requiredEvents[contractType][fIdx]) continue;

					let sig = this.web3.eth.abi.encodeEventSignature(abis[contractType][idx]);
					sig = sig.slice(2).toLowerCase(); // Remove 0x and force lowercase jic

					if (input.indexOf(sig) === -1) {
						verbose && log.debug(contractType + " event: " + abis[contractType][idx].name, ": NOT FOUND");
						matches.splice(matches.indexOf(contractType), 1);
						break contract_standard;
					} else {
						verbose && log.debug(contractType + " event: " + abis[contractType][idx].name, ": FOUND");
					}
				}
			}
		}

		return matches;
	}

	async determineStandardByCall(address, verbose = false) {
		return false;
	}
}

module.exports = ContractIdentifier;
