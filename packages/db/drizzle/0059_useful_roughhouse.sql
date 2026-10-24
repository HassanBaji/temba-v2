ALTER TABLE "courts" ADD COLUMN "sport" "group_sport" DEFAULT 'padel' NOT NULL;--> statement-breakpoint
CREATE INDEX "courts_venue_id_sport_idx" ON "courts" USING btree ("venue_id","sport");