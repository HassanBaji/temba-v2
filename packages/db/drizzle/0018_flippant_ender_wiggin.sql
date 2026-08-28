DROP INDEX "group_invite_links_active_group_unique";--> statement-breakpoint
ALTER TABLE "group_invite_links" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
UPDATE "group_invite_links" SET "expires_at" = now();--> statement-breakpoint
ALTER TABLE "group_invite_links" ALTER COLUMN "expires_at" SET NOT NULL;
