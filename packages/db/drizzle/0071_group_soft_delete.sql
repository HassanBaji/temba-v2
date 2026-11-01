ALTER TABLE "groups" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;