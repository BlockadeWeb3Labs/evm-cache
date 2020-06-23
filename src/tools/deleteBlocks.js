const argv = require('yargs').argv;
const log = require('loglevel');
const Database = require(__dirname + '/../database/Database.js');
const BlockchainQueries = require(__dirname + '/../database/queries/BlockchainQueries.js');
const EthereumClient = require('evm-chain-monitor').EthereumClient;
const DataVerifier = require(__dirname + '/../classes/DataVerifier.js');

if (!argv.hasOwnProperty('start') || !argv.hasOwnProperty('end')) {
	log.error("Incorrect arguments for tool:");
	log.error("\tnode deleteBlocks.js --start [start block number] --end [end block number (exclusive)]");
	process.exit(1);
}

Database.connect((Client) => {
	Client.query(BlockchainQueries.getBlockchainsAndNodes(), (result) => {
		Client.release();

		if (!result || !result.rowCount) {
			log.error('No blockchain nodes found in database.');
			process.exit();
		}

		// Allow the user to set overrides
		let startBlockOverride = parseInt(argv.start, 10);
		let endBlockOverride   = parseInt(argv.end, 10);

		// Delete everything between them
		
	});
});
