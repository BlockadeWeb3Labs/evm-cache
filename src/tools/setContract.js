const argv = require('yargs').argv;
const log = require('loglevel');
const ContractController = require(__dirname + '/../controller/ContractController.js');

if (!argv.hasOwnProperty('address')) {
	log.error("Incorrect arguments for tool:");
	log.error("\tnode evaluateContract.js --address [contract address]")
	process.exit(1);
}

(async (address) => {
	const cc = new ContractController();
	cc.setContractMetadata(address, () => {
		console.log("Done.");
		process.exit();
	});
})(argv.address);
