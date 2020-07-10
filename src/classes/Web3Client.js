const Web3 = require('web3');
const log  = require('loglevel');

class Web3Client {
	constructor(config) {
		this.web3     = null;
		this.endpoint = config.endpoint;

		// Connect off the bat
		this.connect();
	}

	connect() {
		let provider = this.endpoint;
		if (this.endpoint.indexOf('ws://') !== -1 || this.endpoint.indexOf('wss://') !== -1) {
			provider = new Web3.providers.WebsocketProvider(this.endpoint);
		}

		this.web3 = new Web3(provider);
	}

	getWeb3() {
		return this.web3;
	}

	getBlock(blockHashOrNumber = "latest", callback = null) {
		return this.web3.eth.getBlock(blockHashOrNumber, true, callback);
	}

	getTransactionReceipt(txHash, callback = null) {
		return this.web3.eth.getTransactionReceipt(txHash, callback);
	}
}

module.exports = Web3Client;
