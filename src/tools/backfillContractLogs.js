const argv = require('yargs').argv;
const log = require('loglevel');
const ContractController = require(__dirname + '/../controller/ContractController.js');

if (!argv.hasOwnProperty('blockchain_id') ||
	!argv.hasOwnProperty('block_limit') ||
	!argv.hasOwnProperty('address')
) {
	log.error("Incorrect arguments for tool:");
	log.error("\tnode evaluateContract.js\n\t--blockchain_id [number]\n\t--block_limit [number of blocks to search]\n\t--address [contract address]\n\t(optional) --start [block number]")
	process.exit(1);
}

(async (blockchain_id, address, block_limit, start = null) => {
	const ci = new ContractController();
	ci.backfillContractLogs(blockchain_id, address, block_limit, start, () => {
		console.log("Done.");
		process.exit();
	});
})(argv.blockchain_id, argv.address, argv.block_limit, argv.start);
