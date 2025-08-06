DROP VIEW IF EXISTS vw_achievements;

CREATE VIEW vw_achievements AS
SELECT * FROM vw_survivor
UNION ALL
SELECT * FROM vw_sniper_shot
UNION ALL
SELECT * FROM vw_phoenix_rising
UNION ALL
SELECT * FROM vw_trial_by_combat
UNION ALL
SELECT * FROM vw_breaker_of_blades
UNION ALL
SELECT * FROM vw_seasoned_executioner
UNION ALL
SELECT * FROM vw_missed_chapter
UNION ALL
SELECT * FROM vw_league_loyalist
UNION ALL
SELECT * FROM vw_centurion
UNION ALL
SELECT * FROM vw_launch_sequence
UNION ALL
SELECT * FROM vw_early_overlord;
