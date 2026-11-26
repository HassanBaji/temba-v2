CREATE TYPE "public"."match_event_kind" AS ENUM('goal', 'own_goal', 'warning', 'red_card');--> statement-breakpoint
CREATE TYPE "public"."red_card_reason" AS ENUM('second_warning', 'serious_foul', 'violent_conduct', 'dissent', 'other');--> statement-breakpoint
CREATE TABLE "match_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"kind" "match_event_kind" NOT NULL,
	"side_index" integer NOT NULL,
	"user_id" uuid,
	"minute" integer NOT NULL,
	"logged_at" timestamp NOT NULL,
	"reason" "red_card_reason",
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_events_side_index_check" CHECK ("match_events"."side_index" in (1, 2)),
	CONSTRAINT "match_events_minute_check" CHECK ("match_events"."minute" between 0 and 999),
	CONSTRAINT "match_events_reason_check" CHECK ("match_events"."reason" is null or "match_events"."kind" = 'red_card')
);
--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_events_match_id_idx" ON "match_events" USING btree ("match_id","position");