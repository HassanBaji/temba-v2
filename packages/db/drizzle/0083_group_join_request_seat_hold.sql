ALTER TABLE "group_join_requests" ADD COLUMN "held_game_id" uuid;--> statement-breakpoint
ALTER TABLE "group_join_requests" ADD COLUMN "seat_held_until" timestamp;--> statement-breakpoint
ALTER TABLE "group_join_requests" ADD COLUMN "held_seat" jsonb;--> statement-breakpoint
ALTER TABLE "group_join_requests" ADD CONSTRAINT "group_join_requests_held_game_id_games_id_fk" FOREIGN KEY ("held_game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;