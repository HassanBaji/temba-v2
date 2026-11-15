ALTER TABLE "king_place_awards" ADD COLUMN "had_rating" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "place_awards_settled_at";