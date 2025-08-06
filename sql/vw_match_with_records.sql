DROP VIEW IF EXISTS vw_match_with_records;

CREATE vw_match_with_records AS
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
    o.cumulativeLosses AS opponentLosses
FROM matches m
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
