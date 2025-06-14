DROP VIEW IF EXISTS vw_centurion;

CREATE VIEW vw_centurion AS
SELECT
	winnerId as playerId,
	count(*) as progress,
	count(*) >= 50 as common,
	count(*) >= 100 as uncommon,
	count(*) >= 200 as rare,
	count(*) >= 350 as mythic,
	count(*) >= 500 as spg,
	'Centurion' as name,
	28 as collector
FROM matches
WHERE playerId IS NOT null
GROUP BY winnerId;
