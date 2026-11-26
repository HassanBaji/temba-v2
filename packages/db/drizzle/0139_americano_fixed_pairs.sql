CREATE TABLE "americano_fixed_pairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"first_game_player_id" uuid NOT NULL,
	"second_game_player_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "americano_fixed_pairs" ADD CONSTRAINT "americano_fixed_pairs_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "americano_fixed_pairs" ADD CONSTRAINT "americano_fixed_pairs_first_game_player_id_game_players_id_fk" FOREIGN KEY ("first_game_player_id") REFERENCES "public"."game_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "americano_fixed_pairs" ADD CONSTRAINT "americano_fixed_pairs_second_game_player_id_game_players_id_fk" FOREIGN KEY ("second_game_player_id") REFERENCES "public"."game_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "americano_fixed_pairs_game_id_position_unique" ON "americano_fixed_pairs" USING btree ("game_id","position");--> statement-breakpoint
CREATE INDEX "americano_fixed_pairs_first_game_player_id_idx" ON "americano_fixed_pairs" USING btree ("first_game_player_id");--> statement-breakpoint
CREATE INDEX "americano_fixed_pairs_second_game_player_id_idx" ON "americano_fixed_pairs" USING btree ("second_game_player_id");