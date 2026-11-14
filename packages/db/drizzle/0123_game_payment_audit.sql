CREATE TYPE "public"."game_payment_event_action" AS ENUM('claimed', 'unclaimed', 'paid', 'not_received', 'undone');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'game_payment_claimed';--> statement-breakpoint
CREATE TABLE "game_payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" "game_payment_event_action" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_players" ADD COLUMN "kickoff_football_role" "football_role";--> statement-breakpoint
ALTER TABLE "game_payment_events" ADD CONSTRAINT "game_payment_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_payment_events" ADD CONSTRAINT "game_payment_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_payment_events" ADD CONSTRAINT "game_payment_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_payment_events_game_id_idx" ON "game_payment_events" USING btree ("game_id","created_at");--> statement-breakpoint
CREATE INDEX "game_payment_events_user_id_idx" ON "game_payment_events" USING btree ("user_id");