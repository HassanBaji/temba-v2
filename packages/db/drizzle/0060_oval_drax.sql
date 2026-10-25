CREATE TYPE "public"."group_link_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "group_link_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"status" "group_link_request_status" DEFAULT 'pending' NOT NULL,
	"decided_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "is_venue_community" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "group_link_requests" ADD CONSTRAINT "group_link_requests_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_link_requests" ADD CONSTRAINT "group_link_requests_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_link_requests" ADD CONSTRAINT "group_link_requests_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_link_requests" ADD CONSTRAINT "group_link_requests_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_link_requests_pending_unique" ON "group_link_requests" USING btree ("group_id","venue_id") WHERE "group_link_requests"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "communities_venue_community_unique" ON "communities" USING btree ("venue_id") WHERE "communities"."is_venue_community";--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_venue_community_has_venue" CHECK (not "communities"."is_venue_community" or "communities"."venue_id" is not null);