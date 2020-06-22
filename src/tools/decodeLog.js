const argv = require('yargs').argv;
const log = require('loglevel');
const LogParser = require(__dirname + '/../classes/LogParser.js');

if (!argv.hasOwnProperty('hash')) {
	log.error("Incorrect arguments for tool:");
	log.error("\tnode evaluateContract.js --hash [transaction hash]")
	process.exit(1);
}

(async (hash) => {
	const lp = new LogParser();
	lp.decodeTransactionLogs(hash, (events) => {
		console.log("Done.");
		console.log(events);
		process.exit();
	});
})(argv.hash);
