DROP VIEW IF EXISTS vw_endgame_runner;

CREATE VIEW vw_endgame_runner AS
SELECT
	playerId,
	COUNT(*) AS progress,
	count(*) >= 1 as common,
	count(*) >= 2 as uncommon,
	count(*) >= 3 as rare,
	count(*) >= 4 as mythic,
	count(*) >= 5 as spg,
	'Endgame Runner' as name,
	2 as collector
FROM
(SELECT * FROM
(SELECT
	winnerId as playerId,
	leagueName
FROM vw_match_with_records
WHERE Week = 6 AND AchievementVersion >= 1
UNION ALL
SELECT
	opponentId as playerId,
	leagueName
FROM vw_match_with_records
WHERE Week = 6) Group BY playerId, leagueName)
GROUP BY playerId
