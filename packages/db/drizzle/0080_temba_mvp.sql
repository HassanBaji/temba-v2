CREATE TYPE "public"."mvp_decided_by" AS ENUM('vote', 'organizer', 'tie_break');--> statement-breakpoint
CREATE TYPE "public"."mvp_mode" AS ENUM('vote', 'organizer', 'none');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'mvp_decided';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'mvp_tie_break';--> statement-breakpoint
CREATE TABLE "game_mvp_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"voter_user_id" uuid NOT NULL,
	"candidate_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_mvp_votes_game_voter_unique" UNIQUE("game_id","voter_user_id"),
	CONSTRAINT "game_mvp_votes_not_self_check" CHECK ("game_mvp_votes"."voter_user_id" <> "game_mvp_votes"."candidate_user_id")
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "mvp_mode" "mvp_mode" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "mvp_user_id" uuid;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "mvp_decided_by" "mvp_decided_by";--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "mvp_decided_at" timestamp;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "mvp_settled_at" timestamp;--> statement-breakpoint
ALTER TABLE "game_mvp_votes" ADD CONSTRAINT "game_mvp_votes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_mvp_votes" ADD CONSTRAINT "game_mvp_votes_voter_user_id_user_id_fk" FOREIGN KEY ("voter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_mvp_votes" ADD CONSTRAINT "game_mvp_votes_candidate_user_id_user_id_fk" FOREIGN KEY ("candidate_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_mvp_user_id_user_id_fk" FOREIGN KEY ("mvp_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "games" SET "mvp_mode" = 'none';
