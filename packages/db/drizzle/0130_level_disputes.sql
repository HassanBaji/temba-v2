CREATE TYPE "public"."level_dispute_status" AS ENUM('open', 'upheld', 'dismissed');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'level_dispute_raised';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'level_dispute_decided';--> statement-breakpoint
CREATE TABLE "level_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level_override_id" uuid NOT NULL,
	"raised_by_user_id" uuid NOT NULL,
	"note" varchar(280) NOT NULL,
	"status" "level_dispute_status" DEFAULT 'open' NOT NULL,
	"decided_by_user_id" uuid,
	"decided_at" timestamp,
	"restored_override_id" uuid,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "level_dispute_id" uuid;--> statement-breakpoint
ALTER TABLE "level_disputes" ADD CONSTRAINT "level_disputes_level_override_id_level_overrides_id_fk" FOREIGN KEY ("level_override_id") REFERENCES "public"."level_overrides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_disputes" ADD CONSTRAINT "level_disputes_raised_by_user_id_user_id_fk" FOREIGN KEY ("raised_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_disputes" ADD CONSTRAINT "level_disputes_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_disputes" ADD CONSTRAINT "level_disputes_restored_override_id_level_overrides_id_fk" FOREIGN KEY ("restored_override_id") REFERENCES "public"."level_overrides"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "level_disputes_level_override_unique" ON "level_disputes" USING btree ("level_override_id");--> statement-breakpoint
CREATE INDEX "level_disputes_restored_override_id_idx" ON "level_disputes" USING btree ("restored_override_id");--> statement-breakpoint
CREATE INDEX "level_disputes_status_created_idx" ON "level_disputes" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_level_dispute_id_level_disputes_id_fk" FOREIGN KEY ("level_dispute_id") REFERENCES "public"."level_disputes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_level_dispute_id_idx" ON "notifications" USING btree ("level_dispute_id");