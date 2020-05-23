CREATE TYPE CONTRACT_STANDARD_TYPE as ENUM(
	'erc20',
	'erc165',
	'erc721',
	'erc777',
	'erc1155'
);

-- Allows us to identify standard ABIs for contracts
CREATE TABLE contract_standard (
	"contract_standard_id" BIGSERIAL PRIMARY KEY,
	"standard"             CONTRACT_STANDARD_TYPE NOT NULL,
	"version"              BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE contract (
	"contract_id"          BIGSERIAL PRIMARY KEY,
	"blockchain_id"        BIGINT REFERENCES "blockchain" (blockchain_id) NOT NULL,
	"address"              BYTEA NOT NULL UNIQUE,
	"created_block"        BIGINT,
	"created_time"         TIMESTAMP WITH TIME ZONE,
	"contract_standard_id" BIGINT REFERENCES "contract_standard" (contract_standard_id)
);

-- Default v0 contracts
INSERT INTO contract_standard (standard, version)
VALUES ('erc20', 0), ('erc721', 0), ('erc1155', 0);
