CREATE TYPE "public"."tournament_shape" AS ENUM('groups_only', 'groups_then_knockout', 'knockout_only');--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "tournament_shape" "tournament_shape";--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "qualifiers_per_pool" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "knockout_round" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "knockout_position" integer;--> statement-breakpoint
ALTER TABLE "game_teams" ADD COLUMN "knockout_seed" integer;