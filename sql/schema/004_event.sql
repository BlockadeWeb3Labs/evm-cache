CREATE TABLE event (
	"event_id" BIGSERIAL PRIMARY KEY,
	"log_id"   BIGINT REFERENCES "log" (log_id) ON DELETE CASCADE UNIQUE NOT NULL,
	"name"     TEXT NOT NULL,
	"result"   JSONB
);

CREATE INDEX event_name_idx ON "event" ("name");

-- For indexing: quickly find addresses related to events
-- We could do this with JSONB, but there's a major performance impact
--"addresses"     BYTEA[]
--CREATE INDEX parsed_log_addresses_idx ON "parsed_log" USING GIN("addresses");

CREATE TABLE event_transfer (
	"event_transfer_id" BIGSERIAL PRIMARY KEY,
	"event_id"          BIGINT REFERENCES "event" (event_id) ON DELETE CASCADE NOT NULL,
	"to"                BYTEA,
	"from"              BYTEA,
	"id"                NUMERIC,
	"value"             NUMERIC
);
