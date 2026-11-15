ALTER TABLE "level_overrides" DROP CONSTRAINT "level_overrides_set_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "group_level_overrides" DROP CONSTRAINT "group_level_overrides_set_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "games" DROP CONSTRAINT "games_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "groups" DROP CONSTRAINT "groups_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "group_seasons" DROP CONSTRAINT "group_seasons_created_by_user_id_fk";
--> statement-breakpoint
UPDATE "games" SET "sport" = 'padel' WHERE "sport" IS NULL;--> statement-breakpoint
UPDATE "groups" SET "type" = 'private' WHERE "type" IS NULL;--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "sport" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "level_overrides" ADD CONSTRAINT "level_overrides_set_by_user_id_user_id_fk" FOREIGN KEY ("set_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_level_overrides" ADD CONSTRAINT "group_level_overrides_set_by_user_id_user_id_fk" FOREIGN KEY ("set_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_seasons" ADD CONSTRAINT "group_seasons_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rating_events_match_id_idx" ON "rating_events" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "group_rating_events_match_id_idx" ON "group_rating_events" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "games_group_id_window_start_idx" ON "games" USING btree ("group_id","window_start");--> statement-breakpoint
CREATE INDEX "games_created_by_idx" ON "games" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "games_venue_id_idx" ON "games" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "games_challenge_id_idx" ON "games" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "matches_game_id_idx" ON "matches" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "matches_slot_1_game_team_id_idx" ON "matches" USING btree ("slot_1_game_team_id");--> statement-breakpoint
CREATE INDEX "matches_slot_2_game_team_id_idx" ON "matches" USING btree ("slot_2_game_team_id");--> statement-breakpoint
CREATE INDEX "matches_walkover_game_team_id_idx" ON "matches" USING btree ("walkover_game_team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_game_id_knockout_place_unique" ON "matches" USING btree ("game_id","knockout_round","knockout_position") WHERE "matches"."knockout_round" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "matches_game_id_pool_round_pairing_unique" ON "matches" USING btree ("game_id","round_number",least("slot_1_game_team_id", "slot_2_game_team_id"),greatest("slot_1_game_team_id", "slot_2_game_team_id")) WHERE "matches"."round_number" is not null and "matches"."knockout_round" is null;--> statement-breakpoint
CREATE INDEX "tournament_draft_matches_slot_1_game_team_id_idx" ON "tournament_draft_matches" USING btree ("slot_1_game_team_id");--> statement-breakpoint
CREATE INDEX "tournament_draft_matches_slot_2_game_team_id_idx" ON "tournament_draft_matches" USING btree ("slot_2_game_team_id");--> statement-breakpoint
CREATE INDEX "game_teams_game_id_idx" ON "game_teams" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_teams_team_id_idx" ON "game_teams" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "game_team_players_game_team_id_idx" ON "game_team_players" USING btree ("game_team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_team_players_game_player_id_unique" ON "game_team_players" USING btree ("game_player_id");--> statement-breakpoint
CREATE INDEX "game_waitlist_user_id_idx" ON "game_waitlist" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "game_waitlist_team_id_idx" ON "game_waitlist" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "game_member_invites_game_id_idx" ON "game_member_invites" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_invite_links_game_id_idx" ON "game_invite_links" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "group_members_user_id_idx" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_seasons_group_id_idx" ON "group_seasons" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "teams_group_id_idx" ON "teams" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "team_members_user_id_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "challenges_team_id_idx" ON "challenges" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "proposals_team_id_idx" ON "challenge_proposals" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "group_invite_links_group_id_idx" ON "group_invite_links" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_join_requests_user_id_idx" ON "group_join_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_group_id_idx" ON "notifications" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "notifications_game_id_idx" ON "notifications" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "notifications_challenge_id_idx" ON "notifications" USING btree ("challenge_id");