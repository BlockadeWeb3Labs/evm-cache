const argv = require('yargs').argv;
const log = require('loglevel');
const ContractController = require(__dirname + '/../controller/ContractController.js');

if (!argv.hasOwnProperty('hash')) {
	log.error("Incorrect arguments for tool:");
	log.error("\tnode evaluateContract.js --hash [transaction hash]")
	process.exit(1);
}

(async (hash) => {
	const ci = new ContractController();
	ci.setDecodedLogsByTransaction(hash, () => {
		console.log("Done.");
		process.exit();
	});
})(argv.hash);
