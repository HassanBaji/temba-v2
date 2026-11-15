CREATE TYPE "public"."match_dispute_status" AS ENUM('open', 'upheld', 'dismissed');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'match_dispute_raised';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'match_dispute_decided';--> statement-breakpoint
CREATE TABLE "match_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"raised_by_user_id" uuid NOT NULL,
	"note" varchar(280) NOT NULL,
	"status" "match_dispute_status" DEFAULT 'open' NOT NULL,
	"decided_by_user_id" uuid,
	"decided_at" timestamp,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "match_dispute_id" uuid;--> statement-breakpoint
ALTER TABLE "match_disputes" ADD CONSTRAINT "match_disputes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_disputes" ADD CONSTRAINT "match_disputes_raised_by_user_id_user_id_fk" FOREIGN KEY ("raised_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_disputes" ADD CONSTRAINT "match_disputes_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_disputes_match_id_idx" ON "match_disputes" USING btree ("match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_disputes_open_match_unique" ON "match_disputes" USING btree ("match_id") WHERE "match_disputes"."status" = 'open';--> statement-breakpoint
CREATE INDEX "match_disputes_status_created_idx" ON "match_disputes" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_match_dispute_id_match_disputes_id_fk" FOREIGN KEY ("match_dispute_id") REFERENCES "public"."match_disputes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_match_dispute_id_idx" ON "notifications" USING btree ("match_dispute_id");