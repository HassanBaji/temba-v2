ALTER TABLE "games" ADD COLUMN "season_id" uuid;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_season_id_group_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."group_seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_season_id_idx" ON "games" USING btree ("season_id");--> statement-breakpoint
UPDATE "games" AS g
SET "season_id" = s."id"
FROM "group_seasons" AS s
WHERE g."group_id" = s."group_id"
  AND g."window_start" IS NOT NULL
  AND ((g."window_start" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bahrain')::date BETWEEN s."starts_on" AND s."ends_on";
