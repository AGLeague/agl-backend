DROP VIEW IF EXISTS vw_untouchable;

CREATE VIEW vw_untouchable AS
SELECT
	WinnerId as playerId,
	count(*) as progress,
	0 as common,
	0 as uncommon,
	0 as rare,
	0 as mythic,
	count(*) >= 1 as spg,
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
	WHERE Wins >= 7)
GROUP BY PlayerId
