ALTER TYPE "public"."notification_type" ADD VALUE 'level_set';--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "level_override_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_level_override_id_level_overrides_id_fk" FOREIGN KEY ("level_override_id") REFERENCES "public"."level_overrides"("id") ON DELETE cascade ON UPDATE no action;