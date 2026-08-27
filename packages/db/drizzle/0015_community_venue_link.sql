CREATE TYPE "public"."venue_link_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "venue_link_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"status" "venue_link_request_status" DEFAULT 'pending' NOT NULL,
	"decided_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "venue_id" uuid;--> statement-breakpoint
ALTER TABLE "venue_link_requests" ADD CONSTRAINT "venue_link_requests_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_link_requests" ADD CONSTRAINT "venue_link_requests_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_link_requests" ADD CONSTRAINT "venue_link_requests_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_link_requests" ADD CONSTRAINT "venue_link_requests_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "venue_link_requests_pending_community_unique" ON "venue_link_requests" USING btree ("community_id") WHERE "venue_link_requests"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;