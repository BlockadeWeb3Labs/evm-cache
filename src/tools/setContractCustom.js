const argv = require('yargs').argv;
const log = require('loglevel');
const ContractController = require(__dirname + '/../controller/ContractController.js');

if (!argv.hasOwnProperty('address')) {
	log.error("Incorrect arguments for tool:");
	log.error("\tnode setContractCustom.js\n\t--address [contract address]\n\t(optional)--name [custom name]")
	process.exit(1);
}

(async (address, custom_name = null) => {
	const cc = new ContractController();
	cc.setContractCustom(address, custom_name, () => {
		console.log("Done.");
		process.exit();
	});
})(argv.address, argv.name);
