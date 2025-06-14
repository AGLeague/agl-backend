DROP VIEW IF EXISTS vw_survivor;

CREATE VIEW vw_survivor AS
SELECT playerId,
	count(*) as progress,
	count(*) > 0 as common,
	count(*) > 1 as uncommon,
	count(*) > 2 as rare,
	count(*) > 3 as mythic,
	count(*) > 4 as spg,
	'Survivor' as name,
	3 as collector
FROM vw_leagueMatchCount
INNER JOIN leagues on vw_leagueMatchCount.leagueName = leagues.code
WHERE matchCount >= 30 AND achievementVersion >= 1
GROUP BY playerId;
