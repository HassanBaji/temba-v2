CREATE TYPE "public"."user_preferred_position" AS ENUM('left', 'right', 'either');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "preferred_position" "user_preferred_position";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboarding_completed_at" timestamp;--> statement-breakpoint
UPDATE "user" SET "onboarding_completed_at" = "created_at" WHERE "onboarding_completed_at" IS NULL;
