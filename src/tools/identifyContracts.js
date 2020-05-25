const log = require('loglevel');
const ContractIdentifier = require(__dirname + '/../classes/ContractIdentifier.js');

if (process.argv.length < 5) {
	log.error("Incorrect arguments for tool:");
	log.error("\tnode identifyContracts.js [blockchain_id] [start_block_number] [end_block_number]")
	process.exit(1);
}

const blockchain_id      = parseInt(process.argv[2], 10);
const start_block_number = parseInt(process.argv[3], 10);
const end_block_number   = parseInt(process.argv[4], 10);

const ci = new ContractIdentifier(blockchain_id);
ci.searchAndEvaluate(start_block_number, end_block_number, true);
