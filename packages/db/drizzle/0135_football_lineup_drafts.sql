CREATE TABLE "football_lineup_draft_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"game_player_id" uuid NOT NULL,
	"side_index" integer NOT NULL,
	CONSTRAINT "football_lineup_draft_players_side_index_check" CHECK ("football_lineup_draft_players"."side_index" in (1, 2))
);
--> statement-breakpoint
CREATE TABLE "football_lineup_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"method" "football_teams_method" NOT NULL,
	"slot1_bib" "football_bib" NOT NULL,
	"slot2_bib" "football_bib" NOT NULL,
	"saved_by" uuid NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "football_lineup_drafts_bibs_differ_check" CHECK ("football_lineup_drafts"."slot1_bib" <> "football_lineup_drafts"."slot2_bib")
);
--> statement-breakpoint
ALTER TABLE "football_lineup_draft_players" ADD CONSTRAINT "football_lineup_draft_players_draft_id_football_lineup_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."football_lineup_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_draft_players" ADD CONSTRAINT "football_lineup_draft_players_game_player_id_game_players_id_fk" FOREIGN KEY ("game_player_id") REFERENCES "public"."game_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD CONSTRAINT "football_lineup_drafts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "football_lineup_drafts" ADD CONSTRAINT "football_lineup_drafts_saved_by_user_id_fk" FOREIGN KEY ("saved_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "football_lineup_draft_players_draft_id_idx" ON "football_lineup_draft_players" USING btree ("draft_id");--> statement-breakpoint
CREATE UNIQUE INDEX "football_lineup_draft_players_game_player_id_unique" ON "football_lineup_draft_players" USING btree ("game_player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "football_lineup_drafts_game_id_unique" ON "football_lineup_drafts" USING btree ("game_id");