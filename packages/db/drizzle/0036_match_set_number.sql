ALTER TABLE "match_sets" ADD COLUMN "set_number" integer;--> statement-breakpoint
UPDATE "match_sets" AS s
SET "set_number" = sub.n
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY match_id
      ORDER BY created_at ASC, id ASC
    ) AS n
  FROM "match_sets"
) AS sub
WHERE s.id = sub.id;--> statement-breakpoint
ALTER TABLE "match_sets" ALTER COLUMN "set_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "match_sets" ADD CONSTRAINT "match_sets_match_id_set_number_unique" UNIQUE("match_id","set_number");
