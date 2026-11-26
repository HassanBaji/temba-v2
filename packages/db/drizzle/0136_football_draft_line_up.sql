CREATE TYPE "public"."football_draft_answer" AS ENUM('approved', 'change_asked');--> statement-breakpoint
CREATE TYPE "public"."football_first_pick" AS ENUM('toss', 'slot1', 'slot2');--> statement-breakpoint
CREATE TYPE "public"."football_pick_status" AS ENUM('waiting', 'live', 'done');--> statement-breakpoint
ALTER TYPE "public"."football_teams_method" ADD VALUE 'captain_pick';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_draft_shared';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_draft_changed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_draft_approved';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_draft_change_asked';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_pick_room_opened';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_pick_reminder';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'football_pick_done';--> statement-breakpoint
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
CREATE TABLE "football_lineup_draft_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"game_player_id" uuid NOT NULL,
	"side_index" integer NOT NULL,
	"pick_number" integer,
	CONSTRAINT "football_lineup_draft_players_side_index_check" CHECK ("football_lineup_draft_players"."side_index" in (1, 2))
);
--> statement-breakpoint
CREATE TABLE "football_lineup_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"method" "football_teams_method" NOT NULL,
	"slot1_bib" "football_bib" NOT NULL,
	"slot2_bib" "football_bib" NOT NULL,
	"slot1_captain_game_player_id" uuid,
	"slot2_captain_game_player_id" uuid,
	"pick_status" "football_pick_status",
	"first_pick" "football_first_pick",
	"first_pick_side" integer,
	"pick_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"pick_stopped_at" timestamp,
	"slot1_captain_seen_at" timestamp,
	"slot2_captain_seen_at" timestamp,
	"saved_by" uuid NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "football_lineup_drafts_bibs_differ_check" CHECK ("football_lineup_drafts"."slot1_bib" <> "football_lineup_drafts"."slot2_bib"),
	CONSTRAINT "football_lineup_drafts_first_pick_side_check" CHECK ("football_lineup_drafts"."first_pick_side" is null or "football_lineup_drafts"."first_pick_side" in (1, 2))
);
--> statement-breakpoint
ALTER TABLE "game_teams" ADD COLUMN "captain_game_player_id" uuid;--> statement-breakpoint
ALTER TABLE "football_lineup_draft_answers" ADD CONSTRAINT "football_lineup_draft_answers_draft_id_football_lineup_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."football_lineup_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_draft_answers" ADD CONSTRAINT "football_lineup_draft_answers_captain_user_id_user_id_fk" FOREIGN KEY ("captain_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_draft_players" ADD CONSTRAINT "football_lineup_draft_players_draft_id_football_lineup_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."football_lineup_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_draft_players" ADD CONSTRAINT "football_lineup_draft_players_game_player_id_game_players_id_fk" FOREIGN KEY ("game_player_id") REFERENCES "public"."game_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD CONSTRAINT "football_lineup_drafts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD CONSTRAINT "football_lineup_drafts_slot1_captain_game_player_id_game_players_id_fk" FOREIGN KEY ("slot1_captain_game_player_id") REFERENCES "public"."game_players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD CONSTRAINT "football_lineup_drafts_slot2_captain_game_player_id_game_players_id_fk" FOREIGN KEY ("slot2_captain_game_player_id") REFERENCES "public"."game_players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD CONSTRAINT "football_lineup_drafts_saved_by_user_id_fk" FOREIGN KEY ("saved_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "football_lineup_draft_answers_draft_side_unique" ON "football_lineup_draft_answers" USING btree ("draft_id","side_index");--> statement-breakpoint
CREATE INDEX "football_lineup_draft_answers_captain_user_id_idx" ON "football_lineup_draft_answers" USING btree ("captain_user_id");--> statement-breakpoint
CREATE INDEX "football_lineup_draft_players_draft_id_idx" ON "football_lineup_draft_players" USING btree ("draft_id");--> statement-breakpoint
CREATE UNIQUE INDEX "football_lineup_draft_players_pick_number_unique" ON "football_lineup_draft_players" USING btree ("draft_id","pick_number") WHERE "football_lineup_draft_players"."pick_number" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "football_lineup_draft_players_game_player_id_unique" ON "football_lineup_draft_players" USING btree ("game_player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "football_lineup_drafts_game_id_unique" ON "football_lineup_drafts" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "football_lineup_drafts_slot1_captain_game_player_id_idx" ON "football_lineup_drafts" USING btree ("slot1_captain_game_player_id");--> statement-breakpoint
CREATE INDEX "football_lineup_drafts_slot2_captain_game_player_id_idx" ON "football_lineup_drafts" USING btree ("slot2_captain_game_player_id");--> statement-breakpoint
ALTER TABLE "game_teams" ADD CONSTRAINT "game_teams_captain_game_player_id_game_players_id_fk" FOREIGN KEY ("captain_game_player_id") REFERENCES "public"."game_players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_teams_captain_game_player_id_idx" ON "game_teams" USING btree ("captain_game_player_id");