CREATE TYPE "public"."game_gender_tag" AS ENUM('men', 'women', 'mixed');--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "gender_tag" "game_gender_tag";