DROP INDEX "community_invite_links_active_community_unique";--> statement-breakpoint
ALTER TABLE "community_invite_links" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
UPDATE "community_invite_links" SET "expires_at" = now();--> statement-breakpoint
ALTER TABLE "community_invite_links" ALTER COLUMN "expires_at" SET NOT NULL;
