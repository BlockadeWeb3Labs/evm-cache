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
		created_time,
		sha3_uncles,
		logs_bloom,
		transactions_root,
		receipts_root,
		state_root,
		mix_hash,
		miner,
		difficulty,
		extra_data,
		size
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
						created_time,
						sha3_uncles,
						logs_bloom,
						transactions_root,
						receipts_root,
						state_root,
						mix_hash,
						miner,
						difficulty,
						extra_data,
						size
					)
				VALUES (
					$1,
					$2,
					$3,
					$4,
					$5,
					$6,
					$7,
					TO_TIMESTAMP($8),
					$9,
					$10,
					$11,
					$12,
					$13,
					$14,
					$15,
					$16,
					$17,
					$18
				)
				ON CONFLICT DO NOTHING
				RETURNING *;
			`,
			values: [
				blockchain_id,
				number,
				hexToBytea(hash),
				hexToBytea(parent_hash),
				hexToBytea(nonce),
				gas_limit,
				gas_used,
				created_time,
				hexToBytea(sha3_uncles),
				hexToBytea(logs_bloom),
				hexToBytea(transactions_root),
				hexToBytea(receipts_root),
				hexToBytea(state_root),
				hexToBytea(mix_hash),
				hexToBytea(miner),
				difficulty,
				hexToBytea(extra_data),
				size
			]
		}
	}

	static addOmmer(
		blockchain_id,
		hash,
		nibling_block_id
	) {
		return {
			text: `
				INSERT INTO
					ommer (
						blockchain_id,
						hash,
						nibling_block_id
					)
				VALUES (
					$1,
					$2,
					$3
				)
				ON CONFLICT DO NOTHING
				RETURNING *;
			`,
			values: [
				blockchain_id,
				hash,
				nibling_block_id
			]
		}
	}
}

module.exports = BlockQueries;
