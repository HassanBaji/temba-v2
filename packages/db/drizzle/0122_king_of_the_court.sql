ALTER TYPE "public"."tournament_shape" ADD VALUE 'king_of_the_court';--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "final_order_posted_at" timestamp;--> statement-breakpoint
ALTER TABLE "game_teams" ADD COLUMN "start_court" integer;--> statement-breakpoint
ALTER TABLE "game_teams" ADD COLUMN "final_place" integer;