CREATE TYPE "public"."football_draft_answer" AS ENUM('approved', 'change_asked');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_draft_shared';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_draft_changed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_draft_approved';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_draft_change_asked';--> statement-breakpoint
CREATE TABLE "football_lineup_draft_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"side_index" integer NOT NULL,
	"captain_user_id" uuid NOT NULL,
	"answer" "football_draft_answer" NOT NULL,
	"note" varchar(140),
	"answered_player_ids" uuid[] NOT NULL,
	"answered_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "football_lineup_draft_answers_side_index_check" CHECK ("football_lineup_draft_answers"."side_index" in (1, 2)),
	CONSTRAINT "football_lineup_draft_answers_note_check" CHECK ("football_lineup_draft_answers"."answer" <> 'change_asked' or "football_lineup_draft_answers"."note" is not null)
);
--> statement-breakpoint
ALTER TABLE "game_teams" ADD COLUMN "captain_game_player_id" uuid;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD COLUMN "slot1_captain_game_player_id" uuid;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD COLUMN "slot2_captain_game_player_id" uuid;--> statement-breakpoint
ALTER TABLE "football_lineup_draft_answers" ADD CONSTRAINT "football_lineup_draft_answers_draft_id_football_lineup_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."football_lineup_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_draft_answers" ADD CONSTRAINT "football_lineup_draft_answers_captain_user_id_user_id_fk" FOREIGN KEY ("captain_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "football_lineup_draft_answers_draft_side_unique" ON "football_lineup_draft_answers" USING btree ("draft_id","side_index");--> statement-breakpoint
CREATE INDEX "football_lineup_draft_answers_captain_user_id_idx" ON "football_lineup_draft_answers" USING btree ("captain_user_id");--> statement-breakpoint
ALTER TABLE "game_teams" ADD CONSTRAINT "game_teams_captain_game_player_id_game_players_id_fk" FOREIGN KEY ("captain_game_player_id") REFERENCES "public"."game_players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD CONSTRAINT "football_lineup_drafts_slot1_captain_game_player_id_game_players_id_fk" FOREIGN KEY ("slot1_captain_game_player_id") REFERENCES "public"."game_players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD CONSTRAINT "football_lineup_drafts_slot2_captain_game_player_id_game_players_id_fk" FOREIGN KEY ("slot2_captain_game_player_id") REFERENCES "public"."game_players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_teams_captain_game_player_id_idx" ON "game_teams" USING btree ("captain_game_player_id");--> statement-breakpoint
CREATE INDEX "football_lineup_drafts_slot1_captain_game_player_id_idx" ON "football_lineup_drafts" USING btree ("slot1_captain_game_player_id");--> statement-breakpoint
CREATE INDEX "football_lineup_drafts_slot2_captain_game_player_id_idx" ON "football_lineup_drafts" USING btree ("slot2_captain_game_player_id");