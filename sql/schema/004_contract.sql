CREATE TYPE CONTRACT_STANDARD_TYPE as ENUM(
	'erc20',
	'erc165',
	'erc721',
	'erc777',
	'erc998',
	'erc1155'
);

CREATE TABLE contract_meta (
	"contract_meta_id" BIGSERIAL PRIMARY KEY,
	"address"          BYTEA NOT NULL UNIQUE,
	"standard"         CONTRACT_STANDARD_TYPE,
	"abi"              JSONB,
	"name"             TEXT,
	"symbol"           TEXT,
	"custom_name"      TEXT -- Provided directly as an override
);
