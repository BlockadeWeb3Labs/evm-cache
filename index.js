const log = require('loglevel');
const db = require('./src/database/Database.js');
const BlockchainQueries = require('./src/database/queries/BlockchainQueries.js');
const EthereumClient = require('evm-chain-monitor').EthereumClient;
const CacheMonitor = require('./src/classes/CacheMonitor.js');

let pool = db.getPool();
pool.connect((err, client, release) => {
	if (err) {
		log.error('Error acquiring client', err.stack);
		process.exit(1);
	}

	client.query(BlockchainQueries.getBlockchainsAndNodes(), (err, result) => {
		release();
		if (err) {
			log.error('Error executing query', err.stack);
			process.exit(1);
		}

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
		let client = new EthereumClient({
			"endpoint" : node.endpoint
		});

		// Start the monitor
		let cm = new CacheMonitor(node.blockchain_id, client);
		cm.start();

		log.debug("Started client monitor.");
	});
});
