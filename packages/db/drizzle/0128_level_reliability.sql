CREATE TYPE "public"."performance_rater_role" AS ENUM('player', 'level_setter', 'operator');--> statement-breakpoint
ALTER TABLE "rating_events" ADD COLUMN "reliability_part" double precision;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "reliability" double precision DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_rating_results" ADD COLUMN "reliability_before" double precision;--> statement-breakpoint
ALTER TABLE "performance_rating_results" ADD COLUMN "reliability_after" double precision;--> statement-breakpoint
ALTER TABLE "performance_ratings" ADD COLUMN "rater_role" "performance_rater_role" DEFAULT 'player' NOT NULL;