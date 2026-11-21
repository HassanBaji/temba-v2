ALTER TABLE "live_boards" ADD COLUMN "round_clock_by_hand" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "live_boards" ADD COLUMN "round_clock_round" integer;--> statement-breakpoint
ALTER TABLE "live_boards" ADD COLUMN "round_clock_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "live_boards" ADD COLUMN "round_clock_running_since" timestamp;--> statement-breakpoint
ALTER TABLE "live_boards" ADD COLUMN "round_clock_elapsed_ms" integer DEFAULT 0 NOT NULL;