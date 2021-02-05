const argv = require('yargs').argv;
const log = require('loglevel');
const Web3Client = require('./src/classes/Web3Client.js');
const Database = require('./src/database/Database.js');
const BlockchainQueries = require('./src/database/queries/BlockchainQueries.js');
const ContractController = require('./src/controller/ContractController.js');

const LIMIT = 50;

Database.connect(async (Client) => {

	// Kick it off
	Client.query(BlockchainQueries.getBlockchainsAndNodes(), (result) => {
		// Kill the client
		Client.release();

		if (!result || !result.rowCount) {
			log.error('No blockchain nodes found in database.');
			process.exit();
		}

		// ASSUMPTION: We're only going to watch one node at a time
		// But the SQL is built to handle multiple nodes and blockchains.
		// Regardless, one per at the moment
		let node = result.rows[0];

		// ASSUMPTION: We're only supporting Ethereum right now
		// Create a new monitor instance
		const evmClient = new Web3Client({
			"endpoint" : node.endpoint
		});

		// Now do the whole thing
		const cc = new ContractController(evmClient);
		cc.iterateMetadataUpdates(LIMIT, callback);

		function callback(numUpdated) {
			if (numUpdated > 0) {
				console.log("More metadata to update:", numUpdated);
				cc.iterateMetadataUpdates(LIMIT, callback);
			} else {
				console.log("No metadata to update, waiting...");
				setTimeout(cc.iterateMetadataUpdates.bind(cc, LIMIT, callback), 5000);
			}
		}
	});

});
