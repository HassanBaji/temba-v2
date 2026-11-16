ALTER TYPE "public"."tournament_shape" ADD VALUE 'americano';--> statement-breakpoint
CREATE TABLE "americano_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"game_player_id" uuid NOT NULL,
	"slot" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "americano_seats" ADD CONSTRAINT "americano_seats_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "americano_seats" ADD CONSTRAINT "americano_seats_game_player_id_game_players_id_fk" FOREIGN KEY ("game_player_id") REFERENCES "public"."game_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "americano_seats_match_id_game_player_id_unique" ON "americano_seats" USING btree ("match_id","game_player_id");--> statement-breakpoint
CREATE INDEX "americano_seats_match_id_idx" ON "americano_seats" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "americano_seats_game_player_id_idx" ON "americano_seats" USING btree ("game_player_id");