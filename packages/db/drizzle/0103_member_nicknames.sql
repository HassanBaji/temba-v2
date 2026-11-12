CREATE TYPE "public"."member_nickname_visibility" AS ENUM('approvers', 'group');--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "nickname" varchar(24);--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "nickname_visibility" "member_nickname_visibility" DEFAULT 'approvers' NOT NULL;--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "nickname_updated_by_id" uuid;--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "nickname_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_nickname_updated_by_id_user_id_fk" FOREIGN KEY ("nickname_updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;