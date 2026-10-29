CREATE TYPE "public"."group_member_role" AS ENUM('member', 'organizer');--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "role" "group_member_role" DEFAULT 'member' NOT NULL;