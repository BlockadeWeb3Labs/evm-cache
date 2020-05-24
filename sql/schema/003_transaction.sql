CREATE TABLE transaction (
	"transaction_id"    BIGSERIAL PRIMARY KEY,
	"block_id"          BIGINT REFERENCES "block" (block_id) NOT NULL,
	"hash"              BYTEA NOT NULL,
	"nonce"             BIGINT,
	"transaction_index" BIGINT,
	"from"              BYTEA NOT NULL,
	"to"                BYTEA,
	"value"             NUMERIC,
	"gas_price"         NUMERIC,
	"gas"               BIGINT,
	"input"             BYTEA,
	"status"            BOOLEAN,
	"contract_address"  BYTEA,
	"v"                 BYTEA,
	"r"                 BYTEA,
	"s"                 BYTEA
);

CREATE TABLE log (
	"log_id"         BIGSERIAL PRIMARY KEY,
	"transaction_id" BIGINT REFERENCES "transaction" (transaction_id) NOT NULL,
	"log_index"      BIGINT,
	"address"        BYTEA,
	"data"           BYTEA,
	"topic_0"        BYTEA,
	"topic_1"        BYTEA,
	"topic_2"        BYTEA,
	"topic_3"        BYTEA
);
