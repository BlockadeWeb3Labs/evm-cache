CREATE TABLE block (
	"block_id"      BIGSERIAL PRIMARY KEY,
	"blockchain_id" BIGINT REFERENCES "blockchain" (blockchain_id) NOT NULL,
	"number"        BIGINT NOT NULL,
	"hash"          BYTEA NOT NULL UNIQUE,
	"parent_hash"   BYTEA NOT NULL,
	"nonce"         BYTEA NOT NULL,
	"gas_limit"     BIGINT,
	"gas_used"      BIGINT,
	"created_time"  TIMESTAMP WITH TIME ZONE
);
