ALTER TABLE "football_lineup_drafts" ADD COLUMN "pick_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD COLUMN "pick_stopped_at" timestamp;