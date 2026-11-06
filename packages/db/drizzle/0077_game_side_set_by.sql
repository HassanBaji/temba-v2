ALTER TYPE "public"."notification_type" ADD VALUE 'game_side_changed' BEFORE 'history_linked';--> statement-breakpoint
ALTER TABLE "game_team_players" ADD COLUMN "side_set_by" uuid;--> statement-breakpoint
ALTER TABLE "game_team_players" ADD CONSTRAINT "game_team_players_side_set_by_user_id_fk" FOREIGN KEY ("side_set_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;