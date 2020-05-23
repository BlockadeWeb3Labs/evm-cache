CREATE TABLE address (
	"address_id" BIGSERIAL PRIMARY KEY,
	"address"    BYTEA NOT NULL UNIQUE
);
