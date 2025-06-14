DROP VIEW IF EXISTS vw_elimination_matches;

CREATE VIEW vw_elimination_matches AS
SELECT * FROM
(
SELECT
	matches.*,
	row_number() over (partition by opponentId, leagueName order by timestamp) as loses,
	leagues.deathAtLoss
FROM matches
INNER JOIN Leagues ON matches.leagueName = leagues.code
)
WHERE loses = deathAtLoss;
