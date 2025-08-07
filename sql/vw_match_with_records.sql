DROP VIEW IF EXISTS vw_match_with_records;

CREATE VIEW vw_match_with_records AS
WITH match_events AS (SELECT
	*,
	WinnerId as PlayerId,
	1 as Win
FROM Matches
UNION ALL
SELECT
	*,
	opponentId as PlayerId,
	0 as Win
FROM Matches
)

SELECT
    m.*,
    w.cumulativeWins AS winnerWins,
    w.cumulativeLosses AS winnerLosses,
    o.cumulativeWins AS opponentWins,
    o.cumulativeLosses AS opponentLosses,
	l.achievementVersion,
	(CASE
		WHEN l.leagueStart IS NULL THEN NULL
		WHEN m.timestamp > date(l.leagueStart, '+5 week') THEN 6
		WHEN m.timestamp > date(l.leagueStart, '+4 week') THEN 5
		WHEN m.timestamp > date(l.leagueStart, '+3 week') THEN 4
		WHEN m.timestamp > date(l.leagueStart, '+2 week') THEN 3
		WHEN m.timestamp > date(l.leagueStart, '+1 week') THEN 2
		ELSE 1 END) AS 'Week'
FROM matches m
INNER JOIN leagues l ON m.leagueName = l.code
JOIN (
    SELECT *
    FROM (
        SELECT *,
               SUM(win) OVER (PARTITION BY playerId, leagueName ORDER BY timestamp) AS cumulativeWins,
               COUNT(*) OVER (PARTITION BY playerId, leagueName ORDER BY timestamp) - SUM(win) OVER (PARTITION BY playerId, leagueName ORDER BY timestamp) AS cumulativeLosses
        FROM match_events
    )
) w ON m.timestamp = w.timestamp AND m.winnerId = w.playerId
JOIN (
    SELECT *
    FROM (
        SELECT *,
               SUM(win) OVER (PARTITION BY playerId, leagueName ORDER BY timestamp) AS cumulativeWins,
               COUNT(*) OVER (PARTITION BY playerId, leagueName ORDER BY timestamp) - SUM(win) OVER (PARTITION BY playerId, leagueName ORDER BY timestamp) AS cumulativeLosses
        FROM match_events
    )
) o ON m.timestamp = o.timestamp AND m.opponentId = o.playerId;
