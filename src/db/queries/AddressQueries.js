const hexToBytea = require('../../util/hexToBytea.js');

class AddressQueries {
	static addAddress(
		address
	) {
		return {
			text: `
				INSERT INTO
					address (
						address
					)
				VALUES (
					$1
				)
				ON CONFLICT DO NOTHING;
			`,
			values: [
				hexToBytea(address)
			]
		}
	}
}

module.exports = AddressQueries;
