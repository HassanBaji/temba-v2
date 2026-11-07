CREATE TYPE "public"."mark_kind" AS ENUM('dynamo', 'let_him_cook', 'mr_fumble', 'sayed_malek', 'clutch', 'mr_ice', 'smash_machine', 'goal_machine', 'great_wall', 'comeback_king', 'underdog', 'good_game');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'mark_received';--> statement-breakpoint
CREATE TABLE "marks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"giver_user_id" uuid NOT NULL,
	"receiver_user_id" uuid NOT NULL,
	"kind" "mark_kind" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marks_match_giver_receiver_unique" UNIQUE("match_id","giver_user_id","receiver_user_id"),
	CONSTRAINT "marks_not_self_check" CHECK ("marks"."giver_user_id" <> "marks"."receiver_user_id")
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "mark_kind" "mark_kind";--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_giver_user_id_user_id_fk" FOREIGN KEY ("giver_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_receiver_user_id_user_id_fk" FOREIGN KEY ("receiver_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "marks_receiver_user_id_idx" ON "marks" USING btree ("receiver_user_id");--> statement-breakpoint
CREATE INDEX "marks_match_id_idx" ON "marks" USING btree ("match_id");--> statement-breakpoint
UPDATE "matches" SET "completed_at" = "updated_at" WHERE "status" = 'completed';
