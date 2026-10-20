CREATE TABLE "venue_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "cover_photo_id" uuid;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "detail_photo_id" uuid;--> statement-breakpoint
ALTER TABLE "venue_photos" ADD CONSTRAINT "venue_photos_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "venue_photos_venue_id_created_at_idx" ON "venue_photos" USING btree ("venue_id","created_at");--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_cover_photo_id_venue_photos_id_fk" FOREIGN KEY ("cover_photo_id") REFERENCES "public"."venue_photos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_detail_photo_id_venue_photos_id_fk" FOREIGN KEY ("detail_photo_id") REFERENCES "public"."venue_photos"("id") ON DELETE set null ON UPDATE no action;