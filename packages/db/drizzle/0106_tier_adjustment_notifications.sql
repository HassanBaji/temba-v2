ALTER TYPE "public"."notification_type" ADD VALUE 'tier_points_adjusted';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'tier_band_changed';--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "group_tier_event_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_group_tier_event_id_group_tier_events_id_fk" FOREIGN KEY ("group_tier_event_id") REFERENCES "public"."group_tier_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_group_tier_event_id_idx" ON "notifications" USING btree ("group_tier_event_id");