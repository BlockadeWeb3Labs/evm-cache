const hexToBytea = require('../../util/hexToBytea.js');

class ContractQueries {
	static addContract(
		blockchain_id,
		address,
		contract_standard,
		abi
	) {
		return {
			text: `
				INSERT INTO
					contract (
						blockchain_id,
						address,
						contract_standard_id,
						abi
					)
				VALUES (
					$1,
					$2,
					COALESCE((
						SELECT
							contract_standard_id
						FROM
							contract_standard
						WHERE
							version = 0 AND
							standard = $3
					), NULL),
					$4
				)
				RETURNING *;
			`,
			values: [
				blockchain_id,
				hexToBytea(address),
				contract_standard,
				abi
			]
		}
	}
}

module.exports = ContractQueries;
