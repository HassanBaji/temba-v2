ALTER TYPE "public"."notification_type" ADD VALUE 'game_teams_posted';--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "organizer_makes_teams" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "teams_posted_at" timestamp;--> statement-breakpoint
ALTER TABLE "game_players" ADD COLUMN "preferred_side" "game_position";