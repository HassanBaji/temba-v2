ALTER TABLE "games" ADD COLUMN "venue_id" uuid;--> statement-breakpoint
UPDATE "games" AS g
SET "venue_id" = c."venue_id"
FROM "groups" AS grp
INNER JOIN "communities" AS c ON c.id = grp.community_id
INNER JOIN "venues" AS v ON v.id = c.venue_id
WHERE g.group_id = grp.id
	AND g.venue_id IS NULL
	AND c.venue_id IS NOT NULL
	AND v.archived_at IS NULL;--> statement-breakpoint
UPDATE "games"
SET "venue_id" = (
	SELECT v.id
	FROM "venues" AS v
	WHERE v.archived_at IS NULL
	ORDER BY v.name, v.city, v.country, v.id
	LIMIT 1
)
WHERE "venue_id" IS NULL;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "games" WHERE "venue_id" IS NULL) THEN
		RAISE EXCEPTION 'Cannot backfill games.venue_id: Games exist and no live Venue exists';
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "venue_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;
