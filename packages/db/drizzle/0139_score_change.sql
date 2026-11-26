CREATE TYPE "public"."score_change_reason" AS ENUM('set_score_wrong', 'sets_swapped', 'not_finished', 'other');--> statement-breakpoint
CREATE TABLE "match_score_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"changed_by_user_id" uuid NOT NULL,
	"reason" "score_change_reason",
	"previous_sets" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_score_changes_match_id_unique" UNIQUE("match_id")
);
--> statement-breakpoint
ALTER TABLE "match_score_changes" ADD CONSTRAINT "match_score_changes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_score_changes" ADD CONSTRAINT "match_score_changes_changed_by_user_id_user_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;