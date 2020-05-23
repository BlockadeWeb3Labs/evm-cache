const hexToBytea = require('../../util/hexToBytea.js');

class BlockQueries {
	static getLatestBlock(blockchain_id) {
		return {
			text: `
				SELECT
					*
				FROM
					block
				WHERE
					blockchain_id = $1
				ORDER BY
					number DESC
				LIMIT
					1;
			`,
			values: [
				blockchain_id
			]
		}
	}

	static addBlock(
		blockchain_id,
		number,
		hash,
		parent_hash,
		nonce,
		gas_limit,
		gas_used,
		created_time
	) {
		return {
			text: `
				INSERT INTO
					block (
						blockchain_id,
						number,
						hash,
						parent_hash,
						nonce,
						gas_limit,
						gas_used,
						created_time
					)
				VALUES (
					$1,
					$2,
					$3,
					$4,
					$5,
					$6,
					$7,
					TO_TIMESTAMP($8)
				)
				ON CONFLICT DO NOTHING;
			`,
			values: [
				blockchain_id,
				number,
				hexToBytea(hash),
				hexToBytea(parent_hash),
				hexToBytea(nonce),
				gas_limit,
				gas_used,
				created_time
			]
		}
	}
}

module.exports = BlockQueries;
