ALTER TABLE "group_tier_events" ADD COLUMN "member_count" integer;--> statement-breakpoint
-- A place cut before this column reads against the Group's members as they are now, never fewer than were ranked then.
UPDATE "group_tier_events" SET "member_count" = GREATEST(
  "ranked_count",
  (SELECT count(*)::integer FROM "group_members" WHERE "group_members"."group_id" = "group_tier_events"."group_id")
)
WHERE "ranked_count" IS NOT NULL;
