DROP VIEW IF EXISTS vw_leagueMatchCount;

CREATE VIEW vw_leagueMatchCount AS
SELECT leagueName, playerId, count(*) as matchCount
FROM (
	SELECT
	id, winnerId as playerId, leagueName
	FROM Matches
	UNION
	SELECT
	id, opponentId as playerId, leagueName
	FROM Matches
) GROUP BY playerId, leagueName
ORDER BY LeagueName;
