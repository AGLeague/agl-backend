DROP VIEW IF EXISTS vw_league_loyalist;

CREATE VIEW vw_league_loyalist AS
SELECT
	players.id as playerId,
	count(*) as progress,
	count(*) >= 3 as common,
	count(*) >= 5 as uncommon,
	count(*) >= 10 as rare,
	count(*) >= 20 as mythic,
	count(*) >= 30 as spg,
	'League Loyalist' as name,
	25 as collector
FROM players
INNER JOIN leaguePlacements ON leaguePlacements.playerId = players.id
GROUP BY players.id;
