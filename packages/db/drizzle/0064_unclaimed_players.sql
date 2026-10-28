ALTER TYPE "public"."notification_type" ADD VALUE 'game_seated_by_organizer';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'history_linked';--> statement-breakpoint
CREATE TABLE "user_merges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survivor_user_id" uuid NOT NULL,
	"merged_user_id" uuid NOT NULL,
	"phone_number" text NOT NULL,
	"merged_at" timestamp DEFAULT now() NOT NULL,
	"summary" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "added_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "added_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_merges" ADD CONSTRAINT "user_merges_survivor_user_id_user_id_fk" FOREIGN KEY ("survivor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_added_by_user_id_user_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_unclaimed_has_phone" CHECK ("user"."added_at" is null or "user"."clerk_id" is not null or "user"."phone_number" is not null);