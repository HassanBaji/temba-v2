-- The padel Group Level is retired (ADR-0066): a padel Game with no completed Match stops counting for it. Completed padel Games keep their flag and their rows.
UPDATE "games" SET "group_rated" = false
WHERE "sport" = 'padel'
  AND "group_rated" = true
  AND NOT EXISTS (
    SELECT 1 FROM "matches"
    WHERE "matches"."game_id" = "games"."id"
      AND "matches"."status" = 'completed'
  );
