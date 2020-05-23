const log    = require('loglevel');
const pg     = require('pg');
const config = require('../config/config.js');

class DB {
	constructor() {
		this.pool = new pg.Pool({
			host:                    config.DB_HOST,
			database:                config.DB_NAME,
			user:                    config.DB_USER,
			password:                config.DB_PASS,
			port:                    config.DB_PORT,
			max:                     config.DB_LIMIT,
			idleTimeoutMillis:       config.DB_IDLE_TIMEOUT_MS,
			connectionTimeoutMillis: config.DB_CONN_TIMEOUT_MS
		});

		this.pool.on('error', (err, client) => {
			log.error('Unexpected error on idle pgpool client');
			log.error(new Error().stack);

			// Kill the application? If PM2 will restart it.
			//process.exit(-1);
		});
	}

	getPool() {
		return this.pool;
	}
}

// Singleton DB class
if (!global.databaseInstance) {
	global.databaseInstance = new DB();
}

module.exports = global.databaseInstance;
