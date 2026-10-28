DROP INDEX "team_member_invites_unused_team_unique";--> statement-breakpoint
DROP INDEX "team_email_invites_unused_team_unique";--> statement-breakpoint
ALTER TABLE "courts" ADD COLUMN "sport" "group_sport" DEFAULT 'padel' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "side_size" integer;--> statement-breakpoint
CREATE INDEX "courts_venue_id_sport_idx" ON "courts" USING btree ("venue_id","sport");--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_side_size_check" CHECK ("games"."side_size" is null or "games"."side_size" in (5, 6, 7, 8, 9, 11));--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_football_side_size_check" CHECK ("games"."sport" <> 'football' or "games"."side_size" is not null);