CREATE TABLE "venue_pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"court_id" uuid,
	"weekdays" smallint[] NOT NULL,
	"start_minutes" integer NOT NULL,
	"end_minutes" integer NOT NULL,
	"hourly_rate_fils" integer NOT NULL,
	"label" varchar(60),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "venue_pricing_rules_weekdays_check" CHECK (cardinality("venue_pricing_rules"."weekdays") > 0 and "venue_pricing_rules"."weekdays" <@ array[0,1,2,3,4,5,6]::smallint[]),
	CONSTRAINT "venue_pricing_rules_window_check" CHECK ("venue_pricing_rules"."start_minutes" >= 0 and "venue_pricing_rules"."start_minutes" < "venue_pricing_rules"."end_minutes" and "venue_pricing_rules"."end_minutes" <= 1800),
	CONSTRAINT "venue_pricing_rules_rate_check" CHECK ("venue_pricing_rules"."hourly_rate_fils" >= 0 and "venue_pricing_rules"."hourly_rate_fils" <= 1000000000)
);
--> statement-breakpoint
ALTER TABLE "venue_pricing_rules" ADD CONSTRAINT "venue_pricing_rules_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_pricing_rules" ADD CONSTRAINT "venue_pricing_rules_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "venue_pricing_rules_venue_id_idx" ON "venue_pricing_rules" USING btree ("venue_id");