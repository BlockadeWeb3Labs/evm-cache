const argv = require('yargs').argv;
const log = require('loglevel');
const ContractIdentifier = require(__dirname + '/../classes/ContractIdentifier.js');

if (!argv.hasOwnProperty('blockchainId') ||
	!argv.hasOwnProperty('start') ||
	!argv.hasOwnProperty('end') ||
	!argv.hasOwnProperty('endpoint')
) {
	log.error("Incorrect arguments for tool:");
	log.error("\tnode identifyContracts.js --blockchainId [blockchain_id] --start [start_block_number] --end [end_block_number] --endpoint [mainnet eth endpoint]")
	process.exit(1);
}

const blockchain_id      = parseInt(argv.blockchainId, 10);
const start_block_number = parseInt(argv.start, 10);
const end_block_number   = parseInt(argv.end, 10);

const ci = new ContractIdentifier(blockchain_id, argv.endpoint);
ci.searchAndEvaluate(start_block_number, end_block_number, true);
