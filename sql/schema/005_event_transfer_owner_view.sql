CREATE VIEW event_transfer_owner AS 
SELECT DISTINCT ON (et.contract_address, a.address, et.id)
	et.contract_address,
	a.address,
	et.id,
	SUM(CASE WHEN a.address = et.to OR a.address = et.from THEN 1 ELSE 0 END) AS transfers,
	SUM(CASE WHEN a.address = et.to   THEN CASE WHEN et.value IS NOT NULL THEN et.value ELSE 1 END END) AS input,
	SUM(CASE WHEN a.address = et.from THEN CASE WHEN et.value IS NOT NULL THEN et.value ELSE 1 END END) AS output
FROM
	event_transfer et,
	event e,
	log l,
	transaction t,
	block b,
	(
		SELECT "to" AS address FROM event_transfer
		UNION
		SELECT "from" AS address FROM event_transfer
	) AS a
WHERE
	e.event_id = et.event_id AND
	l.log_id = e.log_id AND
	t.hash = l.transaction_hash AND
	b.hash = t.block_hash AND
	(et.to = a.address OR et.from = a.address)
GROUP BY
	et.contract_address,
	a.address,
	et.id;

-- NFT-only version, derived from previous blockchain middleware code
--CREATE VIEW event_transfer_owner_asset AS 
--SELECT DISTINCT ON (contract_address, id)
--	et.contract_address,
--	et.id,
--	et.to
--FROM
--	event_transfer et,
--	event e,
--	log l,
--	transaction t,
--	block b
--WHERE
--	e.event_id = et.event_id AND
--	l.log_id = e.log_id AND
--	t.hash = l.transaction_hash AND
--	b.hash = t.block_hash AND
--	et.id IS NOT NULL
--GROUP BY
--	et.contract_address,
--	et.id,
--	et.to
--ORDER BY
--	et.contract_address,
--	et.id ASC,
--	max(b.number) DESC,
--	max(l.log_index) DESC;
