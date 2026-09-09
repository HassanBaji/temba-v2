ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_email_or_phone_number" CHECK ("email" IS NOT NULL OR "phone_number" IS NOT NULL);
