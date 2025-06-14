DROP VIEW IF EXISTS vw_missed_chapter;

CREATE VIEW vw_missed_chapter AS

SELECT
	winnerId as playerId,
	count(*) as progress,
	count(*) >= 1 as common,
	count(*) >= 2 as uncommon,
	count(*) >= 3 as rare,
	count(*) >= 4 as mythic,
	count(*) >= 5 as spg,
	'Missed Chapter' as name,
	15 as collector

FROM
(SELECT winnerId, matches.leagueName FROM matches
INNER JOIN players as losers on opponentId = losers.id
INNER JOIN leaguePlacements on losers.id = leaguePlacements.playerId AND matches.leagueName = leaguePlacements.leagueName
INNER JOIN leagues on leaguePlacements.leagueName = leagues.code
WHERE leaguePlacements.rank = 1 AND achievementVersion >= 1)
GROUP BY winnerId;
