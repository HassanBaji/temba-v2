ALTER TABLE "rating_events" ADD COLUMN "level_band_before" "rating_level_band";--> statement-breakpoint
ALTER TABLE "rating_events" ADD COLUMN "last_rated_at_before" timestamp;--> statement-breakpoint
ALTER TABLE "group_rating_events" ADD COLUMN "level_band_before" "rating_level_band";--> statement-breakpoint
ALTER TABLE "group_rating_events" ADD COLUMN "last_rated_at_before" timestamp;