ALTER TABLE "user" DROP CONSTRAINT "user_email_or_phone_number";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "clerk_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deleted_clerk_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "user_deleted_clerk_id_idx" ON "user" USING btree ("deleted_clerk_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_email_or_phone_number" CHECK ("user"."email" is not null or "user"."phone_number" is not null or "user"."deleted_at" is not null);