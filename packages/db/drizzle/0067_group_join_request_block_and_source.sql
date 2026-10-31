CREATE TYPE "public"."group_join_request_source" AS ENUM('invite_link', 'community', 'group_page');--> statement-breakpoint
ALTER TYPE "public"."group_join_request_status" ADD VALUE 'blocked';--> statement-breakpoint
ALTER TABLE "group_join_requests" ADD COLUMN "note" varchar(280);--> statement-breakpoint
ALTER TABLE "group_join_requests" ADD COLUMN "source" "group_join_request_source";--> statement-breakpoint
ALTER TABLE "group_join_requests" ADD COLUMN "invited_by" uuid;--> statement-breakpoint
ALTER TABLE "group_join_requests" ADD CONSTRAINT "group_join_requests_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;