// Required libraries
const log = require('loglevel');

class Client {
	constructor(client, release) {
		this.client = client;
		this.release = release;
	}

	async query(query, callback) {
		return this.client.query(query, (err, results) => {
			if (err) {
				this.release();
				log.error('Error with query', err.stack);
				process.exit(1);
			}

			callback(results);
		});
	}

	async release() {
		this.release();
	}
}

module.exports = Client;
