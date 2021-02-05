CREATE TABLE asset_metadata (
	"contract_address"  BYTEA NOT NULL,
	"id"                NUMERIC DEFAULT NULL,
	"token_uri"         TEXT DEFAULT NULL,
	"metadata"          TEXT DEFAULT NULL,
	"last_updated"      TIMESTAMP WITH TIME ZONE DEFAULT NULL,
	"needs_update"      BOOLEAN DEFAULT FALSE,
	PRIMARY KEY ("contract_address", "id")
);

CREATE INDEX asset_metadata_contract_address_idx ON "asset_metadata" ("contract_address");
CREATE INDEX asset_metadata_contract_address_id_idx ON "asset_metadata" ("contract_address", "id");

--ALTER TABLE "contract_meta" ADD COLUMN "token_uri_json_interface" JSONB;
--ALTER TABLE "contract_meta" ADD COLUMN "token_uri_json_interface_parameters" JSONB;
--ALTER TABLE "contract_meta" ADD COLUMN "custom_token_uri" TEXT;
--ALTER TABLE "contract_meta" ADD COLUMN "custom_token_uri_headers" JSONB;

--ALTER TABLE "asset_metadata" ADD COLUMN "needs_update" BOOLEAN DEFAULT FALSE;
