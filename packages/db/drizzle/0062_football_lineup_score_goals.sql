CREATE TYPE "public"."football_bib" AS ENUM('black', 'white', 'red', 'navy', 'sky', 'green', 'yellow', 'orange', 'purple', 'pink', 'grey');--> statement-breakpoint
CREATE TYPE "public"."football_position" AS ENUM('def', 'mid', 'fwd');--> statement-breakpoint
CREATE TYPE "public"."football_role" AS ENUM('outfield', 'keeper');--> statement-breakpoint
CREATE TYPE "public"."football_teams_method" AS ENUM('level', 'manual');--> statement-breakpoint
CREATE TABLE "match_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"goals" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_goals_match_id_user_id_unique" UNIQUE("match_id","user_id"),
	CONSTRAINT "match_goals_goals_check" CHECK ("match_goals"."goals" between 1 and 99)
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "football_teams_method" "football_teams_method";--> statement-breakpoint
ALTER TABLE "game_players" ADD COLUMN "football_role" "football_role";--> statement-breakpoint
ALTER TABLE "game_players" ADD COLUMN "football_position" "football_position";--> statement-breakpoint
ALTER TABLE "game_teams" ADD COLUMN "bib" "football_bib";--> statement-breakpoint
ALTER TABLE "match_goals" ADD CONSTRAINT "match_goals_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_goals" ADD CONSTRAINT "match_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;