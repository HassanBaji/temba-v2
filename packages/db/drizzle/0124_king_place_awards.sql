ALTER TYPE "public"."notification_type" ADD VALUE 'king_place_awarded';--> statement-breakpoint
CREATE TABLE "king_place_awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sport" "group_sport" NOT NULL,
	"game_id" uuid NOT NULL,
	"final_place" integer NOT NULL,
	"wins" double precision NOT NULL,
	"field_mu" double precision NOT NULL,
	"field_phi" double precision NOT NULL,
	"mu_before" double precision NOT NULL,
	"phi_before" double precision NOT NULL,
	"sigma_before" double precision NOT NULL,
	"mu_after" double precision NOT NULL,
	"phi_after" double precision NOT NULL,
	"sigma_after" double precision NOT NULL,
	"level_band_before" "rating_level_band" NOT NULL,
	"last_rated_at_before" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "king_place_awards_user_id_game_id_unique" UNIQUE("user_id","game_id")
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "place_awards_settled_at" timestamp;--> statement-breakpoint
ALTER TABLE "king_place_awards" ADD CONSTRAINT "king_place_awards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "king_place_awards" ADD CONSTRAINT "king_place_awards_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "king_place_awards_game_id_idx" ON "king_place_awards" USING btree ("game_id");