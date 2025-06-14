DROP VIEW IF EXISTS vw_seasoned_executioner;

CREATE VIEW vw_seasoned_executioner AS
SELECT
	winnerId as playerId,
	count(*) as progress,
	count(*) > 10 as common,
	count(*) > 25 as uncommon,
	count(*) > 50 as rare,
	count(*) > 75 as mythic,
	count(*) > 100 as spg,
	'Seasoned Executioner' as name,
	6 as collector
FROM vw_elimination_matches
INNER JOIN leagues on leagues.code = leagueName
WHERE leagues.achievementVersion >= 1
GROUP BY winnerId;
