CREATE TABLE "venue_opening_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"opens_at_minutes" integer NOT NULL,
	"closes_at_minutes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "venue_opening_hours_weekday_check" CHECK ("venue_opening_hours"."weekday" between 0 and 6),
	CONSTRAINT "venue_opening_hours_window_check" CHECK ("venue_opening_hours"."opens_at_minutes" >= 0 and "venue_opening_hours"."opens_at_minutes" < "venue_opening_hours"."closes_at_minutes" and "venue_opening_hours"."closes_at_minutes" <= 1800)
);
--> statement-breakpoint
CREATE TABLE "venue_closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"court_id" uuid,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"reason" varchar(255),
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "venue_closures_range_check" CHECK ("venue_closures"."starts_at" < "venue_closures"."ends_at")
);
--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "cancellation_policy" jsonb DEFAULT '{"tiers":[{"hoursBefore":24,"refundPercent":100}],"lateRefundPercent":0,"customerCancelUntilMinutes":0}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "venue_opening_hours" ADD CONSTRAINT "venue_opening_hours_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_closures" ADD CONSTRAINT "venue_closures_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_closures" ADD CONSTRAINT "venue_closures_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_closures" ADD CONSTRAINT "venue_closures_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "venue_opening_hours_venue_id_weekday_idx" ON "venue_opening_hours" USING btree ("venue_id","weekday");--> statement-breakpoint
CREATE INDEX "venue_closures_venue_id_starts_at_idx" ON "venue_closures" USING btree ("venue_id","starts_at");