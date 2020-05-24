const hexToBytea = require('../../util/hexToBytea.js');

class TransactionQueries {
	static addTransaction(
		block_id,
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
						block_id,
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
				block_id,
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
		transaction_id,
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
						transaction_id,
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
				transaction_id,
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
}      

module.exports = TransactionQueries;
