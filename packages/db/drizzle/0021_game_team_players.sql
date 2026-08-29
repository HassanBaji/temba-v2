CREATE TABLE "game_team_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_team_id" uuid NOT NULL,
	"game_player_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_team_players" ADD CONSTRAINT "game_team_players_game_team_id_game_teams_id_fk" FOREIGN KEY ("game_team_id") REFERENCES "public"."game_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_team_players" ADD CONSTRAINT "game_team_players_game_player_id_game_players_id_fk" FOREIGN KEY ("game_player_id") REFERENCES "public"."game_players"("id") ON DELETE cascade ON UPDATE no action;
