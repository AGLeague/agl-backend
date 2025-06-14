DROP VIEW IF EXISTS vw_sniper_shot;

CREATE VIEW vw_sniper_shot AS

SELECT
	winnerId as playerId,
	count(*) as progress,
	count(*) > 0 as common,
	count(*) > 1 as uncommon,
	count(*) > 2 as rare,
	count(*) > 3 as mythic,
	count(*) > 4 as spg,
	'Sniper Shot' as name,
	5 as collector
FROM
(SELECT winnerId, leagueName, count(*) as eliminations
FROM vw_elimination_matches
INNER JOIN leagues on leagues.code = leagueName
WHERE leagues.achievementVersion >= 1
GROUP BY winnerId, leagueName)
GROUP BY winnerId;
