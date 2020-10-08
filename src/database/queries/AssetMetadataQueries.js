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
						metadata
					)
				VALUES (
					$1, $2, $3, $4
				)
				ON CONFLICT (contract_address, id) DO UPDATE SET
					token_uri = EXCLUDED.token_uri,
					metadata = CASE WHEN EXCLUDED.metadata IS NOT NULL THEN EXCLUDED.metadata ELSE asset_metadata.metadata END;
			`,
			values: [
				hexToBytea(contract_address),
				id,
				token_uri,
				metadata || ""
			]
		}
	}
}      

module.exports = AssetMetadataQueries;
