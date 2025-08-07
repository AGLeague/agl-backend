DROP VIEW IF EXISTS vw_flawless_execution;

CREATE VIEW vw_flawless_execution AS
SELECT
	WinnerId as playerId,
	COUNT(*) AS progress,
	count(*) >= 1 as common,
	count(*) >= 2 as uncommon,
	count(*) >= 3 as rare,
	count(*) >= 4 as mythic,
	count(*) >= 5 as spg,
	'Flawless Execution' as name,
	1 as collector
FROM
(
	SELECT * FROM
		(SELECT
			Week,
			WinnerId,
			LeagueName,
			COUNT(*) AS Wins,
			Leagues.achievementVersion
		FROM vw_match_with_records AS WinnerMatch
		INNER JOIN Leagues ON Leagues.code = winnerMatch.leagueName
		WHERE WinnerMatch.WinnerId not in (SELECT OpponentId from vw_match_with_records AS LoserMatch WHERE WinnerMatch.Week = LoserMatch.Week)
		GROUP BY WinnerId, LeagueName, Week)
	WHERE Wins >= 5)
GROUP BY PlayerId
