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
				ON CONFLICT DO NOTHING
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

	static getContractsInBlockRange(
		blockchain_id,
		start_block_number,
		end_block_number
	) {
		return {
			text: `
				SELECT
					t.contract_address,
					t.input
				FROM
					transaction t,
					block b
				WHERE
					b.blockchain_id = $1 AND
					b.number >= $2 AND
					b.number < $3 AND
					b.block_id = t.block_id AND
					t.contract_address IS NOT NULL;
			`,
			values: [
				blockchain_id,
				start_block_number,
				end_block_number
			]
		}
	}

	static getContractCode(
		address
	) {
		return {
			text: `
				SELECT
					contract_address,
					input
				FROM
					transaction
				WHERE
					contract_address = $1;
			`,
			values: [
				hexToBytea(address)
			]
		}
	}

	static getContractMeta(
		address
	) {
		return {
			text: `
				SELECT
					*
				FROM
					contract_meta
				WHERE
					address = $1;
			`,
			values: [
				hexToBytea(address)
			]
		}
	}

	static upsertContractMeta(
		address,
		standard,
		abi,
		name,
		symbol
	) {
		return {
			text: `
				INSERT INTO
					contract_meta (
						address,
						standard,
						abi,
						name,
						symbol
					)
				VALUES (
					$1, $2, $3, $4, $5
				)
				ON CONFLICT (address) DO UPDATE SET
					standard = CASE WHEN EXCLUDED.standard IS NOT NULL THEN EXCLUDED.standard ELSE contract_meta.standard END,
					abi      = CASE WHEN EXCLUDED.abi      IS NOT NULL THEN EXCLUDED.abi      ELSE contract_meta.abi      END,
					name     = CASE WHEN EXCLUDED.name     IS NOT NULL THEN EXCLUDED.name     ELSE contract_meta.name     END,
					symbol   = CASE WHEN EXCLUDED.symbol   IS NOT NULL THEN EXCLUDED.symbol   ELSE contract_meta.symbol   END
			`,
			values: [
				hexToBytea(address),
				standard,
				abi,
				name,
				symbol
			]
		}
	}
}

module.exports = ContractQueries;
