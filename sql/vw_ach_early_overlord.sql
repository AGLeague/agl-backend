DROP VIEW IF EXISTS vw_early_overlord;

CREATE VIEW vw_early_overlord AS
SELECT
playerId,
	Losses,
	0 as common,
	0 as uncommon,
	0 as rare,
	0 as mythic,
	losses <= 2 as spg,
	'Early Overlord' as name,
	206 as collector FROM
(
SELECT matches.opponentId as playerId, count(*) as Losses FROM
(SELECT
	matches.*,
	row_number() over (partition by winnerId order by timestamp) as wins
FROM matches) AS nWin
INNER JOIN Matches ON Matches.opponentId = nWin.winnerId
WHERE nWin.wins = 13
AND Matches.timestamp < nWin.Timestamp
GROUP BY matches.opponentId
)
WHERE Losses <= 2;
