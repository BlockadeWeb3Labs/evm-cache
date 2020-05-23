const hexToBytea = require('../../util/hexToBytea.js');

class BlockchainQueries {
	static addContract(
		blockchain_id,
		address,
		created_block,
		created_time,
		contract_standard = null
	) {
		return {
			text: `
				INSERT INTO
					contract (
						blockchain_id,
						address,
						created_block,
						created_time,
						contract_standard
					)
				VALUES (
					$1,
					$2,
					$3,
					$4,
					$5
				);
			`,
			values: [
				blockchain_id,
				hexToBytea(address),
				created_block,
				created_time,
				contract_standard
			]
		}
	}
}

module.exports = BlockchainQueries;
