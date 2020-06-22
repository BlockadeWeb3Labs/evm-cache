const hexToBytea = require('../../util/hexToBytea.js');

class TransactionQueries {
	static addTransaction(
		block_hash,
		hash,
		nonce,
		transaction_index,
		_from,
		_to,
		value,
		gas_price,
		gas,
		input,
		status,
		contract_address,
		v,
		r,
		s
	) {
		return {
			text: `
				INSERT INTO
					transaction (
						block_hash,
						hash,
						nonce,
						transaction_index,
						"from",
						"to",
						value,
						gas_price,
						gas,
						input,
						status,
						contract_address,
						v,
						r,
						s
					)
				VALUES (
					$1,
					$2,
					$3,
					$4,
					$5,
					$6,
					$7,
					$8,
					$9,
					$10,
					$11,
					$12,
					$13,
					$14,
					$15
				)
				ON CONFLICT DO NOTHING
				RETURNING *;
			`,
			values: [
				hexToBytea(block_hash),
				hexToBytea(hash),
				nonce,
				transaction_index,
				hexToBytea(_from),
				hexToBytea(_to),
				value,
				gas_price,
				gas,
				hexToBytea(input),
				status,
				hexToBytea(contract_address),
				hexToBytea(v),
				hexToBytea(r),
				hexToBytea(s)
			]
		}
	}

	static addLog(
		transaction_hash,
		log_index,
		address,
		data,
		topic_0,
		topic_1,
		topic_2,
		topic_3
	) {
		return {
			text: `
				INSERT INTO
					log (
						transaction_hash,
						log_index,
						address,
						data,
						topic_0,
						topic_1,
						topic_2,
						topic_3
					)
				VALUES (
					$1,
					$2,
					$3,
					$4,
					$5,
					$6,
					$7,
					$8
				)
				ON CONFLICT DO NOTHING;
			`,
			values: [
				hexToBytea(transaction_hash),
				log_index,
				hexToBytea(address),
				hexToBytea(data),
				hexToBytea(topic_0),
				hexToBytea(topic_1),
				hexToBytea(topic_2),
				hexToBytea(topic_3)
			]
		}
	}

	static deleteLogs(
		blockchain_id,
		number
	) {
		return {
			text: `
				DELETE FROM
					log
				WHERE
					transaction_hash IN (
						SELECT
							hash
						FROM
							transaction
						WHERE
							block_hash = (
								SELECT
									hash
								FROM
									block
								WHERE
									blockchain_id = $1 AND
									number = $2
								LIMIT
									1
							)
					);
			`,
			values: [
				blockchain_id,
				number
			]
		}
	}

	static deleteTransactions(
		blockchain_id,
		number
	) {
		return {
			text: `
				DELETE FROM
					transaction
				WHERE
					block_hash = (
						SELECT
							hash
						FROM
							block
						WHERE
							blockchain_id = $1 AND
							number = $2
						LIMIT
							1
					);
			`,
			values: [
				blockchain_id,
				number
			]
		}
	}

	static getTransactionLogs(
		transaction_hash
	) {
		return {
			text: `
				SELECT
					l.*,
					cm.standard,
					cm.abi
				FROM
					log l
				LEFT JOIN
					contract_meta cm ON
						cm.address = l.address
				WHERE
					l.transaction_hash = $1
			`,
			values: [
				hexToBytea(transaction_hash)
			]
		}
	}
}      

module.exports = TransactionQueries;
