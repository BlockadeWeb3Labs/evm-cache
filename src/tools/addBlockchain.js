const log = require('loglevel');
const db = require('../db/db.js');
const BlockchainQueries = require('../db/queries/BlockchainQueries.js');

if (process.argv.length < 5) {
	log.error("Missing information to add a blockchain to the database:");
	log.error("\tnode addBlockchain.js [blockchain-type] [name] [endpoint]");
	process.exit(1);
}

let type = process.argv[2];
let name = process.argv[3];
let endpoint = process.argv[4];

let pool = db.getPool();
pool.connect((err, client, release) => {
	if (err) {
		log.error('Error acquiring client', err.stack);
		process.exit(1);
	}

	client.query(BlockchainQueries.addBlockchain(type, name), (err, result) => {
		if (err) {
			log.error('Error executing query', err.stack);
			process.exit(1);
		}

		client.query(BlockchainQueries.addBlockchainNode(name, endpoint), (err, result) => {
			release();
			if (err) {
				log.error('Error executing query', err.stack);
				process.exit(1);
			}

			log.info("Done.");
			process.exit();
		});
	});
});
