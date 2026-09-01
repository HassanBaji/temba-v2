ALTER TABLE "game_invite_links" ADD COLUMN "short_code" varchar(8);--> statement-breakpoint
ALTER TABLE "game_invite_links" ADD CONSTRAINT "game_invite_links_short_code_unique" UNIQUE("short_code");