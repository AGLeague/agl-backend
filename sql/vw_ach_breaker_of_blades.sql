DROP VIEW IF EXISTS vw_breaker_of_blades;

CREATE VIEW vw_breaker_of_blades AS
SELECT
	playerId,
	max(eliminationWins) as progress,
	max(eliminationWins) >= 10 as common,
	max(eliminationWins) >= 20 as uncommon,
	max(eliminationWins) >= 30 as rare,
	max(eliminationWins) >= 40 as mythic,
	max(eliminationWins) >= 50 as spg,
	'Breaker of Blades' as name,
	9 as collector
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
