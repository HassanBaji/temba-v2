CREATE TYPE "public"."performance_rating_mode" AS ENUM('off', 'organizer', 'everyone');--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "performance_rating_mode" "performance_rating_mode" DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "performance_weight_percent" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "organizer_counts_double" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_performance_weight_percent_check" CHECK ("groups"."performance_weight_percent" in (20, 30, 50));