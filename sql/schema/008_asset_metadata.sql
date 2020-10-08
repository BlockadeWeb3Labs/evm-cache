CREATE TABLE asset_metadata (
	"asset_metadata_id" BIGSERIAL PRIMARY KEY,
	"contract_address"  BYTEA NOT NULL,
	"id"                NUMERIC DEFAULT NULL,
	"token_uri"         TEXT DEFAULT NULL,
	"metadata"          TEXT DEFAULT NULL,
	"last_updated"      TIMESTAMP WITH TIME ZONE DEFAULT NULL,
	PRIMARY KEY ("contract_address", "id")
);

CREATE INDEX asset_metadata_contract_address_idx ON "asset_metadata" ("contract_address");
CREATE INDEX asset_metadata_contract_address_id_idx ON "asset_metadata" ("contract_address", "id");

--ALTER TABLE "contract_meta" ADD COLUMN "token_uri_json_inferface" JSONB;
--ALTER TABLE "contract_meta" ADD COLUMN "token_uri_json_inferface_parameters" JSONB;
--ALTER TABLE "contract_meta" ADD COLUMN "custom_token_uri" TEXT;
--ALTER TABLE "contract_meta" ADD COLUMN "custom_token_uri_headers" JSONB;
