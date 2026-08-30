CREATE TYPE "public"."game_position" AS ENUM('left', 'right');--> statement-breakpoint
ALTER TABLE "game_team_players" ADD COLUMN "position" "game_position";--> statement-breakpoint
ALTER TABLE "game_teams" ADD COLUMN "side_index" integer;--> statement-breakpoint
WITH ordered AS (
	SELECT
		gtp.id,
		row_number() OVER (
			PARTITION BY gtp.game_team_id
			ORDER BY gtp.created_at, gtp.id
		) AS rn
	FROM "game_team_players" gtp
	INNER JOIN "game_teams" gt ON gtp.game_team_id = gt.id
	INNER JOIN "games" g ON gt.game_id = g.id
	WHERE g.registration_mode = 'individual'
)
UPDATE "game_team_players"
SET "position" = CASE WHEN ordered.rn = 1 THEN 'left'::"game_position" ELSE 'right'::"game_position" END
FROM ordered
WHERE "game_team_players".id = ordered.id;--> statement-breakpoint
UPDATE "game_teams" AS gt
SET "side_index" = 1
FROM "matches" AS m
INNER JOIN "games" AS g ON g.id = m.game_id
WHERE gt.id = m.slot_1_game_team_id
	AND g.format = 'friendly_game'
	AND g.registration_mode = 'individual';--> statement-breakpoint
UPDATE "game_teams" AS gt
SET "side_index" = 2
FROM "matches" AS m
INNER JOIN "games" AS g ON g.id = m.game_id
WHERE gt.id = m.slot_2_game_team_id
	AND g.format = 'friendly_game'
	AND g.registration_mode = 'individual';--> statement-breakpoint
WITH numbered AS (
	SELECT
		gt.id,
		row_number() OVER (
			PARTITION BY gt.game_id
			ORDER BY gt.created_at, gt.id
		) AS rn
	FROM "game_teams" AS gt
	INNER JOIN "games" AS g ON gt.game_id = g.id
	WHERE g.registration_mode = 'individual'
		AND gt.side_index IS NULL
)
UPDATE "game_teams"
SET "side_index" = numbered.rn
FROM numbered
WHERE "game_teams".id = numbered.id;--> statement-breakpoint
CREATE UNIQUE INDEX "game_team_players_game_team_id_position_unique" ON "game_team_players" USING btree ("game_team_id","position") WHERE "game_team_players"."position" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "game_teams_game_id_side_index_unique" ON "game_teams" USING btree ("game_id","side_index") WHERE "game_teams"."side_index" is not null;
