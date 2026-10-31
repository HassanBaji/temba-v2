ALTER TABLE "game_invite_links" ALTER COLUMN "expires_at" DROP NOT NULL;--> statement-breakpoint
UPDATE "game_invite_links" SET "expires_at" = NULL;
