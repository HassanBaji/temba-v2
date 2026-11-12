ALTER TYPE "public"."notification_type" ADD VALUE 'performance_ratings_closed';--> statement-breakpoint
ALTER TABLE "group_tier_events" ADD COLUMN "place_before" integer;