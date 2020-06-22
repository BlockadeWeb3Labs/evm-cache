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
}      

module.exports = EventQueries;
