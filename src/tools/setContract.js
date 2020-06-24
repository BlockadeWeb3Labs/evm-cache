const argv = require('yargs').argv;
const log = require('loglevel');
const ContractController = require(__dirname + '/../controller/ContractController.js');

if (!argv.hasOwnProperty('address')) {
	log.error("Incorrect arguments for tool:");
	log.error("\tnode setContract.js --address [contract address] (optional)--abi [contract abi string]")
	process.exit(1);
}

(async (address, abi = null) => {
	const cc = new ContractController();
	cc.setContractMetadata(address, abi, () => {
		console.log("Done.");
		process.exit();
	});
})(argv.address, argv.abi);
