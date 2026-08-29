ALTER TABLE "user" ADD COLUMN "clerk_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "user_clerk_id_idx" ON "user" USING btree ("clerk_id");