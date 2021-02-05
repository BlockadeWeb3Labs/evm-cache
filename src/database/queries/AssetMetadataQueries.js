const hexToBytea = require('../../util/hexToBytea.js');

class AssetMetadataQueries {
	static upsertMetadata(
		contract_address,
		id,
		token_uri,
		metadata
	) {
		return {
			text: `
				INSERT INTO
					asset_metadata (
						contract_address,
						id,
						token_uri,
						metadata,
						needs_update
					)
				VALUES (
					$1, $2, $3, $4, FALSE
				)
				ON CONFLICT (contract_address, id) DO UPDATE SET
					token_uri = EXCLUDED.token_uri,
					metadata = CASE WHEN EXCLUDED.metadata IS NOT NULL THEN EXCLUDED.metadata ELSE asset_metadata.metadata END,
					needs_update = FALSE;
			`,
			values: [
				hexToBytea(contract_address),
				id,
				token_uri,
				metadata || null
			]
		}
	}

	static enqueueMetadataUpdate(
		contract_address,
		id
	) {
		return {
			text: `
				INSERT INTO
					asset_metadata (
						contract_address,
						id,
						needs_update
					)
				VALUES (
					$1, $2, TRUE
				)
				ON CONFLICT (contract_address, id) DO UPDATE SET
					needs_update = TRUE;
			`,
			values: [
				hexToBytea(contract_address),
				id
			]
		}
	}

	static getAssetsNeedUpdates(
		limit = 50
	) {
		return {
			text: `
				SELECT
					contract_address,
					id
				FROM
					asset_metadata
				WHERE
					needs_update
				LIMIT
					$1;
			`,
			values: [
				parseInt(limit, 10) || 50
			]
		}
	}
}      

module.exports = AssetMetadataQueries;
