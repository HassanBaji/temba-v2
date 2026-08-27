ALTER TABLE "courts" RENAME TO "venues";--> statement-breakpoint
UPDATE "venues" SET "city" = '' WHERE "city" IS NULL;--> statement-breakpoint
ALTER TABLE "venues" ALTER COLUMN "city" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "venues_name_city_country_unique" ON "venues" USING btree (lower(btrim("name")), lower(btrim("city")), lower(btrim("country")));--> statement-breakpoint
ALTER TABLE "coach" DROP CONSTRAINT "coach_court_id_courts_id_fk";--> statement-breakpoint
ALTER TABLE "coaching_session" DROP CONSTRAINT "coaching_session_court_id_courts_id_fk";--> statement-breakpoint
ALTER TABLE "games" DROP CONSTRAINT "games_court_id_courts_id_fk";--> statement-breakpoint
ALTER TABLE "coach" ADD CONSTRAINT "coach_court_id_venues_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_session" ADD CONSTRAINT "coaching_session_court_id_venues_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_court_id_venues_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
