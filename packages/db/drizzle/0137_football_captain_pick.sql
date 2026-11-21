CREATE TYPE "public"."football_first_pick" AS ENUM('toss', 'slot1', 'slot2');--> statement-breakpoint
CREATE TYPE "public"."football_pick_status" AS ENUM('waiting', 'live', 'done');--> statement-breakpoint
ALTER TYPE "public"."football_teams_method" ADD VALUE 'captain_pick';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_pick_room_opened';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_pick_reminder';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_pick_done';--> statement-breakpoint
ALTER TABLE "football_lineup_draft_players" ADD COLUMN "pick_number" integer;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD COLUMN "pick_status" "football_pick_status";--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD COLUMN "first_pick" "football_first_pick";--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD COLUMN "first_pick_side" integer;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD COLUMN "slot1_captain_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD COLUMN "slot2_captain_seen_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "football_lineup_draft_players_pick_number_unique" ON "football_lineup_draft_players" USING btree ("draft_id","pick_number") WHERE "football_lineup_draft_players"."pick_number" is not null;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD CONSTRAINT "football_lineup_drafts_first_pick_side_check" CHECK ("football_lineup_drafts"."first_pick_side" is null or "football_lineup_drafts"."first_pick_side" in (1, 2));