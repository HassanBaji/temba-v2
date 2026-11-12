ALTER TABLE "user" DROP CONSTRAINT "user_email_or_phone_number";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_unclaimed_has_phone";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "guest_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_guest_has_no_account" CHECK ("user"."guest_at" is null or ("user"."clerk_id" is null and "user"."added_at" is not null and "user"."phone_number" is null and "user"."email" is null));--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_email_or_phone_number" CHECK ("user"."email" is not null or "user"."phone_number" is not null or "user"."deleted_at" is not null or "user"."guest_at" is not null);--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_unclaimed_has_phone" CHECK ("user"."added_at" is null or "user"."clerk_id" is not null or "user"."phone_number" is not null or "user"."guest_at" is not null);