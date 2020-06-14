const argv = require('yargs').argv;
const log = require('loglevel');
const ContractIdentifier = require(__dirname + '/../classes/ContractIdentifier.js');

if (!argv.hasOwnProperty('contractAddress') || !argv.hasOwnProperty('endpoint')) {
	log.error("Incorrect arguments for tool:");
	log.error("\tnode evaluateContract.js --contractAddress [contract address] --endpoint [mainnet eth endpoint]")
	process.exit(1);
}

const contract_address = argv.contractAddress;
const endpoint = argv.endpoint;

const ci = new ContractIdentifier(null, endpoint);
ci.evaluate(contract_address);
