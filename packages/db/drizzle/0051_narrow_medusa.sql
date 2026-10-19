CREATE TABLE "venue_managers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"granted_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "venue_managers_venue_id_user_id_unique" UNIQUE("venue_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "accepting_bookings" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "slot_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "duration_options_minutes" integer[] DEFAULT '{60,90}'::integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "booking_horizon_days" integer DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "min_lead_minutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "description" varchar(1000);--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "booking_notes" varchar(1000);--> statement-breakpoint
ALTER TABLE "venue_managers" ADD CONSTRAINT "venue_managers_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_managers" ADD CONSTRAINT "venue_managers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_managers" ADD CONSTRAINT "venue_managers_granted_by_user_id_user_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "venue_managers_user_id_idx" ON "venue_managers" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_slot_minutes_check" CHECK ("venues"."slot_minutes" in (30, 60));--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_booking_horizon_days_check" CHECK ("venues"."booking_horizon_days" between 1 and 90);--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_min_lead_minutes_check" CHECK ("venues"."min_lead_minutes" between 0 and 1440);