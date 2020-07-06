const argv = require('yargs').argv;
const log = require('loglevel');
const Database = require(__dirname + '/../database/Database.js');
const DeleteQueries = require(__dirname + '/../database/queries/DeleteQueries.js');

if (!argv.hasOwnProperty('start') || !argv.hasOwnProperty('end')) {
	log.error("Incorrect arguments for tool:");
	log.error("\tnode deleteBlocks.js --blockchain_id [blockchain ID] --start [start block number] --end [end block number (exclusive)]");
	process.exit(1);
}

let blockchain_id = parseInt(argv.blockchain_id, 10);
let start_number  = parseInt(argv.start, 10);
let end_number    = parseInt(argv.end, 10);

if (start_number === end_number || end_number <= 1) {
	log.error('Invalid start and end blocks');
	process.exit(1);
}

// Delete everything between them
Database.connect(async (Client) => {
	await Client.query(DeleteQueries.deleteOmmers(blockchain_id, start_number, end_number));
	await Client.query(DeleteQueries.deleteLogsAndDependents(blockchain_id, start_number, end_number));
	await Client.query(DeleteQueries.deleteTransactions(blockchain_id, start_number, end_number));
	await Client.query(DeleteQueries.deleteBlocks(blockchain_id, start_number, end_number));
	Client.release();
	process.exit();
});
