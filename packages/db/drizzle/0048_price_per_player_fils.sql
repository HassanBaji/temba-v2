ALTER TABLE "games" ADD COLUMN "price_per_player_fils" integer;--> statement-breakpoint
UPDATE "games" SET "price_per_player_fils" = "price_per_player_cents" * 10 WHERE "price_per_player_cents" IS NOT NULL;
