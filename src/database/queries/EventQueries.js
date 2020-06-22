const hexToBytea = require('../../util/hexToBytea.js');

class EventQueries {
	static insertEvent(
		log_id,
		name,
		result
	) {
		return {
			text: `
				INSERT INTO
					event (
						log_id, name, result
					)
				VALUES (
					$1, $2, $3
				)
				ON CONFLICT (log_id)
				DO NOTHING;
			`,
			values: [
				log_id,
				name,
				result
			]
		}
	}

	static getMostRecentContractEvent(
		address
	) {
		return {
			text: `
				SELECT
					b.number AS block_number,
					e.*
				FROM
					event e,
					log l,
					transaction t,
					block b
				WHERE
					e.log_id = l.log_id AND
					l.address = $1 AND
					t.hash = l.transaction_hash AND
					b.hash = t.block_hash
				ORDER BY
					e.log_id DESC
				LIMIT
					1;
			`,
			values: [
				hexToBytea(address)
			]
		}
	}
}      

module.exports = EventQueries;
