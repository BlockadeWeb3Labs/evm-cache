const argv = require('yargs').argv;
const log = require('loglevel');
const ContractController = require(__dirname + '/../controller/ContractController.js');

if (!argv.hasOwnProperty('blockchain_id') ||
	!argv.hasOwnProperty('log_limit') ||
	!argv.hasOwnProperty('address')
) {
	log.error("Incorrect arguments for tool:");
	log.error("\tnode backfillContractLogsByLogs.js\n\t--blockchain_id [number]\n\t--log_limit [number of logs to search]\n\t--address [contract address]\n\t(optional) --start [log ID number]")
	process.exit(1);
}

(async (blockchain_id, address, log_limit, start = null) => {
	const ci = new ContractController();
	ci.backfillContractLogsByLogs(blockchain_id, address, log_limit, start, () => {
		console.log("Done.");
		process.exit();
	});
})(argv.blockchain_id, argv.address, argv.log_limit, argv.start);
