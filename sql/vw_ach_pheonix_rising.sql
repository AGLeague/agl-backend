DROP VIEW IF EXISTS vw_phoenix_rising;

CREATE VIEW vw_phoenix_rising AS
SELECT
	playerId,
	max(eliminationWins) as progress,
	max(eliminationWins) >= 1 as common,
	max(eliminationWins) >= 2 as uncommon,
	max(eliminationWins) >= 3 as rare,
	max(eliminationWins) >= 4 as mythic,
	max(eliminationWins) >= 5 as spg,
	'Phoenix Rising' as name,
	7 as collector
FROM (
	SELECT
		winnerId as playerId,
		leagueName,
		count(*) as eliminationWins
	FROM vw_match_with_records
	INNER JOIN leagues ON vw_match_with_records.leagueName = leagues.code
	WHERE WinnerLosses = 10 AND leagues.achievementVersion >= 1
	GROUP BY winnerId, leagueName
) GROUP BY playerId
