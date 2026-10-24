ALTER TABLE "groups" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "groups" SET "verified_at" = "created_at" WHERE "verified_at" IS NULL;
