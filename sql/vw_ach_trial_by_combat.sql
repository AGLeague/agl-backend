DROP VIEW IF EXISTS vw_trial_by_combat;

CREATE VIEW vw_trial_by_combat AS
SELECT
	playerId,
	max(eliminationWins) as progress,
	max(eliminationWins) >= 1 as common,
	max(eliminationWins) >= 2 as uncommon,
	max(eliminationWins) >= 3 as rare,
	max(eliminationWins) >= 4 as mythic,
	max(eliminationWins) >= 5 as spg,
	'Trial by Combat' as name,
	8 as collector
FROM (
	SELECT
		winnerId as playerId,
		leagueName,
		count(*) as eliminationWins
	FROM vw_match_with_records
	INNER JOIN leagues ON vw_match_with_records.leagueName = leagues.code
	WHERE winnerLosses = 10 AND opponentLosses = 11
	GROUP BY winnerId, leagueName
) GROUP BY playerId
