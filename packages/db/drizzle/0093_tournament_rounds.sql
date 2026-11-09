ALTER TYPE "public"."notification_type" ADD VALUE 'match_score_to_confirm';--> statement-breakpoint
CREATE TABLE "tournament_draft_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"position" integer NOT NULL,
	"slot_1_game_team_id" uuid NOT NULL,
	"slot_2_game_team_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_draft_matches_game_round_position_unique" UNIQUE("game_id","round_number","position")
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "not_finished_at" timestamp;--> statement-breakpoint
ALTER TABLE "tournament_draft_matches" ADD CONSTRAINT "tournament_draft_matches_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_draft_matches" ADD CONSTRAINT "tournament_draft_matches_slot_1_game_team_id_game_teams_id_fk" FOREIGN KEY ("slot_1_game_team_id") REFERENCES "public"."game_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_draft_matches" ADD CONSTRAINT "tournament_draft_matches_slot_2_game_team_id_game_teams_id_fk" FOREIGN KEY ("slot_2_game_team_id") REFERENCES "public"."game_teams"("id") ON DELETE cascade ON UPDATE no action;