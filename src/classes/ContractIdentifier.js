const fs = require('fs');
const log = require('loglevel');
const Web3 = require('web3');
const db = require('../db/db.js');
const byteaBufferToHex = require('../util/byteaBufferToHex.js');

//const BlockQueries = require('../db/queries/BlockQueries.js');
//const TransactionQueries = require('../db/queries/TransactionQueries.js');
const ContractQueries = require('../db/queries/ContractQueries.js');

class ContractIdentifier {
	constructor(blockchain_id) {
		this.blockchain_id = blockchain_id;
		this.web3 = new Web3();
		this.pool = db.getPool();
		this.client = null;
	}

	async searchAndEvaluate(start_block_number, end_block_number, terminate_on_end = false) {
		this.client = await this.pool.connect();

		if (!this.client) {
			log.error('Error acquiring client');
			process.exit(1);
		}

		// Get the contracts in this range
		return this.client.query(ContractQueries.getContractsInBlockRange(
			this.blockchain_id,
			start_block_number,
			end_block_number
		), async (err, result) => {
			if (err) {
				this.client.release();
				log.error('Error executing query', err.stack);
				process.exit(1);
			}

			if (!result || !result.rowCount) {
				log.info("No contracts found in range");

				if (terminate_on_end) {
					process.exit();
				}

				return;
			} else {
				log.info("Found", result.rowCount, "contracts");
			}

			for (let idx = 0; idx < result.rowCount; idx++) {
				let matches = this.determineStandard(byteaBufferToHex(result.rows[idx].input).toLowerCase());
				console.log("Matches for", byteaBufferToHex(result.rows[idx].contract_address), matches);
			}

			if (terminate_on_end) {
				process.exit();
			}
		});
	}

	determineStandard(input) {
		const requiredFunctions = {
			'erc20' : [
				'balanceOf',
				'transfer',
				'transferFrom',
				'approve',
				'totalSupply'
			],
			'erc721' : [
				'balanceOf',
				'ownerOf',
				'safeTransferFrom',
				'transferFrom',
				'approve',
				'setApprovalForAll',
				'getApproved',
				'isApprovedForAll'
			],
			'erc1155' : [
				'safeTransferFrom',
				'safeBatchTransferFrom',
				//'balanceOf', // Failing, for some reason
				'balanceOfBatch',
				'setApprovalForAll',
				'isApprovedForAll'
			]
		};

		const requiredEvents = {
			'erc20' : [
				'Approval',
				'Transfer'
			],
			'erc721' : [
				'Transfer',
				'Approval',
				'ApprovalForAll'
			],
			'erc1155' : [
				'TransferSingle',
				'TransferBatch',
				'ApprovalForAll',
				'URI'
			]
		};

		const abis = {
			'erc20'   : JSON.parse(fs.readFileSync(__dirname + '/../config/abi/v0/erc20.json', 'utf8')),
			'erc721'  : JSON.parse(fs.readFileSync(__dirname + '/../config/abi/v0/erc721.json', 'utf8')),
			'erc1155' : JSON.parse(fs.readFileSync(__dirname + '/../config/abi/v0/erc1155-mt.json', 'utf8'))
		};

		// Keep track of potential matches, true until proven false
		let matches = {
			'erc20'   : true,
			'erc721'  : true,
			'erc1155' : true
		};

		// Find a matching standard by function
		for (let contractType in requiredFunctions) {
			if (!requiredFunctions.hasOwnProperty(contractType)) continue;

			contract_standard:
			for (let fIdx = 0; fIdx < requiredFunctions[contractType].length; fIdx++) {
				// Find the part of the ABI we want
				for (let idx = 0; idx < abis[contractType].length; idx++) {
					if (abis[contractType][idx].type !== 'function') continue;
					if (abis[contractType][idx].name !== requiredFunctions[contractType][fIdx]) continue;

					let sig = this.web3.eth.abi.encodeFunctionSignature(abis[contractType][idx]);
					sig = sig.slice(2).toLowerCase(); // Remove 0x and force lowercase jic

					if (input.indexOf(sig) === -1) {
						matches[contractType] = false;
						break contract_standard;
					}
				}
			}
		}

		// Find a matching standard by event
		for (let contractType in requiredEvents) {
			if (!requiredEvents.hasOwnProperty(contractType)) continue;

			contract_standard:
			for (let fIdx = 0; fIdx < requiredEvents[contractType].length; fIdx++) {
				// Find the part of the ABI we want
				for (let idx = 0; idx < abis[contractType].length; idx++) {
					if (abis[contractType][idx].type !== 'event') continue;
					if (abis[contractType][idx].name !== requiredEvents[contractType][fIdx]) continue;

					let sig = this.web3.eth.abi.encodeEventSignature(abis[contractType][idx]);
					sig = sig.slice(2).toLowerCase(); // Remove 0x and force lowercase jic

					if (input.indexOf(sig) === -1) {
						matches[contractType] = false;
						break contract_standard;
					}
				}
			}
		}

		return matches;
	}
}

module.exports = ContractIdentifier;
