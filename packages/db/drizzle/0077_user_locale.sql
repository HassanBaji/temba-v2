CREATE TYPE "public"."user_locale" AS ENUM('en', 'ar');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "locale" "user_locale";