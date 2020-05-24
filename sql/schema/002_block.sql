CREATE TABLE block (
	"block_id"          BIGSERIAL PRIMARY KEY,
	"blockchain_id"     BIGINT REFERENCES "blockchain" (blockchain_id) NOT NULL,
	"number"            BIGINT NOT NULL,
	"hash"              BYTEA NOT NULL UNIQUE,
	"parent_hash"       BYTEA NOT NULL,
	"created_time"      TIMESTAMP WITH TIME ZONE,
	"nonce"             BYTEA,
	"gas_limit"         BIGINT,
	"gas_used"          BIGINT,
	"sha3_uncles"       BYTEA,
	"logs_bloom"        BYTEA,
	"transactions_root" BYTEA,
	"receipts_root"     BYTEA,
	"state_root"        BYTEA,
	"mix_hash"          BYTEA,
	"miner"             BYTEA,
	"difficulty"        NUMERIC,
	"extra_data"        BYTEA,
	"size"              BIGINT
);

-- To store the "uncles" data
CREATE TABLE ommer (
	"ommer_id"         BIGSERIAL PRIMARY KEY,
	"blockchain_id"    BIGINT REFERENCES "blockchain" (blockchain_id) NOT NULL,
	"hash"             BYTEA NOT NULL UNIQUE,
	"nibling_block_id" BIGINT REFERENCES "block" (block_id) NOT NULL
);
