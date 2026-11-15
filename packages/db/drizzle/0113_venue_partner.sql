ALTER TABLE "venues" ADD COLUMN "partner_at" timestamp;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "partner_by" uuid;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_partner_by_user_id_fk" FOREIGN KEY ("partner_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;