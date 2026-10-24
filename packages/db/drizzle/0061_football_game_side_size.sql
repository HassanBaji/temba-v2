ALTER TABLE "games" ADD COLUMN "side_size" integer;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_side_size_check" CHECK ("games"."side_size" is null or "games"."side_size" in (5, 6, 7, 8, 9, 11));--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_football_side_size_check" CHECK ("games"."sport" <> 'football' or "games"."side_size" is not null);