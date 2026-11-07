CREATE TYPE "public"."user_locale" AS ENUM('en', 'ar');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_notifications" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "locale" "user_locale";--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "emailed_at" timestamp;