CREATE TYPE "public"."level_override_set_by_role" AS ENUM('level_setter', 'operator', 'verifier');--> statement-breakpoint
ALTER TABLE "level_overrides" ADD COLUMN "set_by_role" "level_override_set_by_role";--> statement-breakpoint
UPDATE "level_overrides" SET "set_by_role" = CASE WHEN "group_id" IS NULL THEN 'operator'::"level_override_set_by_role" ELSE 'level_setter'::"level_override_set_by_role" END;--> statement-breakpoint
ALTER TABLE "level_overrides" ALTER COLUMN "set_by_role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "level_overrides" ADD COLUMN "note" varchar(280);
