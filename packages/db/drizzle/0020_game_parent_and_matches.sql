CREATE TYPE "public"."game_format" AS ENUM('friendly_game', 'americano', 'friendly_tournament');--> statement-breakpoint
CREATE TYPE "public"."game_registration_mode" AS ENUM('individual', 'team_only');--> statement-breakpoint
ALTER TABLE "games" RENAME TO "games_legacy";--> statement-breakpoint
ALTER TABLE "games_legacy" RENAME CONSTRAINT "games_pkey" TO "games_legacy_pkey";--> statement-breakpoint
ALTER TABLE "games_legacy" RENAME CONSTRAINT "games_group_id_groups_id_fk" TO "games_legacy_group_id_groups_id_fk";--> statement-breakpoint
ALTER TABLE "games_legacy" RENAME CONSTRAINT "games_created_by_user_id_fk" TO "games_legacy_created_by_user_id_fk";--> statement-breakpoint
ALTER TABLE "games_legacy" RENAME CONSTRAINT "games_court_id_venues_id_fk" TO "games_legacy_court_id_venues_id_fk";--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"format" "game_format" DEFAULT 'friendly_game' NOT NULL,
	"registration_mode" "game_registration_mode" DEFAULT 'individual' NOT NULL,
	"group_id" uuid,
	"is_public" boolean DEFAULT false NOT NULL,
	"window_start" timestamp,
	"window_end" timestamp,
	"players_allowed" integer,
	"teams_allowed" integer,
	"sport" "game_sport" DEFAULT 'padel',
	"created_by" uuid NOT NULL,
	"cancelled_at" timestamp,
	"registration_closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "games" (
	"id",
	"name",
	"format",
	"registration_mode",
	"group_id",
	"is_public",
	"window_start",
	"window_end",
	"players_allowed",
	"teams_allowed",
	"sport",
	"created_by",
	"cancelled_at",
	"registration_closed_at",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	"name",
	'friendly_game'::"game_format",
	'individual'::"game_registration_mode",
	"group_id",
	"is_public",
	"start_time",
	"end_time",
	4,
	2,
	"sport",
	"created_by",
	CASE WHEN "status" = 'cancelled' THEN COALESCE("status_updated_at", "updated_at") ELSE NULL END,
	NULL,
	"created_at",
	"updated_at"
FROM "games_legacy";--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"court_id" uuid,
	"start_time" timestamp,
	"end_time" timestamp,
	"duration_in_minutes" integer,
	"status" "game_status" DEFAULT 'pending',
	"slot_1_game_team_id" uuid,
	"slot_2_game_team_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "matches" (
	"id",
	"game_id",
	"court_id",
	"start_time",
	"end_time",
	"duration_in_minutes",
	"status",
	"created_at",
	"updated_at"
)
SELECT
	gen_random_uuid(),
	"id",
	NULL,
	"start_time",
	"end_time",
	"duration_in_minutes",
	"status",
	"created_at",
	"updated_at"
FROM "games_legacy";--> statement-breakpoint
ALTER TABLE "game_players" DROP CONSTRAINT "game_players_game_id_games_id_fk";--> statement-breakpoint
ALTER TABLE "game_teams" DROP CONSTRAINT "game_teams_game_id_games_id_fk";--> statement-breakpoint
DROP TABLE "games_legacy";--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_teams" ADD CONSTRAINT "game_teams_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
DELETE FROM "game_players" a USING "game_players" b
WHERE a."user_id" IS NOT NULL
	AND a."user_id" = b."user_id"
	AND a."game_id" = b."game_id"
	AND a."id" > b."id";--> statement-breakpoint
ALTER TABLE "game_players" DROP CONSTRAINT "game_players_added_by_user_id_fk";--> statement-breakpoint
ALTER TABLE "game_players" DROP COLUMN "playerType";--> statement-breakpoint
ALTER TABLE "game_players" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "game_players" DROP COLUMN "added_by";--> statement-breakpoint
ALTER TABLE "game_players" DROP COLUMN "sets_won";--> statement-breakpoint
ALTER TABLE "game_players" DROP COLUMN "sets_lost";--> statement-breakpoint
ALTER TABLE "game_players" DROP COLUMN "paid_at";--> statement-breakpoint
ALTER TABLE "game_players" DROP COLUMN "paid_amount";--> statement-breakpoint
ALTER TABLE "game_players" DROP COLUMN "self_performance_rating";--> statement-breakpoint
CREATE UNIQUE INDEX "game_players_game_id_user_id_unique" ON "game_players" USING btree ("game_id","user_id") WHERE "game_players"."user_id" is not null;--> statement-breakpoint
DELETE FROM "game_teams" a USING "game_teams" b
WHERE a."team_id" IS NOT NULL
	AND a."team_id" = b."team_id"
	AND a."game_id" = b."game_id"
	AND a."id" > b."id";--> statement-breakpoint
ALTER TABLE "game_teams" DROP COLUMN "sets_won";--> statement-breakpoint
ALTER TABLE "game_teams" DROP COLUMN "sets_lost";--> statement-breakpoint
ALTER TABLE "game_teams" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "game_teams" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
CREATE UNIQUE INDEX "game_teams_game_id_team_id_unique" ON "game_teams" USING btree ("game_id","team_id") WHERE "game_teams"."team_id" is not null;--> statement-breakpoint
UPDATE "matches" AS m
SET
	"slot_1_game_team_id" = sub.t1,
	"slot_2_game_team_id" = sub.t2
FROM (
	SELECT
		"game_id",
		(array_agg("id" ORDER BY "created_at", "id"))[1] AS t1,
		(array_agg("id" ORDER BY "created_at", "id"))[2] AS t2
	FROM "game_teams"
	GROUP BY "game_id"
) AS sub
WHERE m."game_id" = sub."game_id";--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_slot_1_game_team_id_game_teams_id_fk" FOREIGN KEY ("slot_1_game_team_id") REFERENCES "public"."game_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_slot_2_game_team_id_game_teams_id_fk" FOREIGN KEY ("slot_2_game_team_id") REFERENCES "public"."game_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "game_waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_waitlist" ADD CONSTRAINT "game_waitlist_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_waitlist" ADD CONSTRAINT "game_waitlist_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_waitlist" ADD CONSTRAINT "game_waitlist_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_waitlist_game_id_created_at_idx" ON "game_waitlist" USING btree ("game_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "game_waitlist_game_id_user_id_unique" ON "game_waitlist" USING btree ("game_id","user_id") WHERE "game_waitlist"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "game_waitlist_game_id_team_id_unique" ON "game_waitlist" USING btree ("game_id","team_id") WHERE "game_waitlist"."team_id" is not null;--> statement-breakpoint
CREATE TABLE "match_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"slot_1_games_won" integer,
	"slot_2_games_won" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_sets" ADD CONSTRAINT "match_sets_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "game_member_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_member_invites" ADD CONSTRAINT "game_member_invites_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_member_invites" ADD CONSTRAINT "game_member_invites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_member_invites" ADD CONSTRAINT "game_member_invites_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_member_invites_unused_game_user_unique" ON "game_member_invites" USING btree ("game_id","user_id") WHERE "game_member_invites"."accepted_at" is null and "game_member_invites"."revoked_at" is null;--> statement-breakpoint
CREATE TABLE "game_invite_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_invite_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "game_invite_links" ADD CONSTRAINT "game_invite_links_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_invite_links" ADD CONSTRAINT "game_invite_links_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "game_invite_link_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_invite_link_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_invite_link_consents" ADD CONSTRAINT "game_invite_link_consents_game_invite_link_id_game_invite_links_id_fk" FOREIGN KEY ("game_invite_link_id") REFERENCES "public"."game_invite_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_invite_link_consents" ADD CONSTRAINT "game_invite_link_consents_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_invite_link_consents" ADD CONSTRAINT "game_invite_link_consents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_invite_link_consents_link_id_user_id_unique" ON "game_invite_link_consents" USING btree ("game_invite_link_id","user_id");--> statement-breakpoint
DROP TYPE "public"."player_type";
