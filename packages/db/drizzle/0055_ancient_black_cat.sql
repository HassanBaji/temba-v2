CREATE TYPE "public"."booking_cancelled_by" AS ENUM('customer', 'venue');--> statement-breakpoint
CREATE TYPE "public"."booking_payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'waived');--> statement-breakpoint
CREATE TYPE "public"."booking_source" AS ENUM('app', 'venue');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending_payment', 'confirmed', 'cancelled', 'no_show', 'expired');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"court_id" uuid NOT NULL,
	"user_id" uuid,
	"guest_name" varchar(255),
	"guest_phone" varchar(32),
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"status" "booking_status" DEFAULT 'confirmed' NOT NULL,
	"hold_expires_at" timestamp,
	"source" "booking_source" NOT NULL,
	"price_fils" integer NOT NULL,
	"cancellation_policy" jsonb NOT NULL,
	"payment_status" "booking_payment_status" DEFAULT 'pending' NOT NULL,
	"refund_due_fils" integer,
	"cancellation_charge_fils" integer,
	"cancelled_at" timestamp,
	"cancelled_by_user_id" uuid,
	"cancelled_by" "booking_cancelled_by",
	"cancel_reason" varchar(500),
	"no_show_at" timestamp,
	"game_id" uuid,
	"manager_notes" varchar(1000),
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_game_id_unique" UNIQUE("game_id"),
	CONSTRAINT "bookings_range_check" CHECK ("bookings"."starts_at" < "bookings"."ends_at"),
	CONSTRAINT "bookings_holder_check" CHECK (("bookings"."user_id" is not null) <> ("bookings"."guest_name" is not null and "bookings"."guest_phone" is not null)),
	CONSTRAINT "bookings_game_holder_check" CHECK ("bookings"."game_id" is null or "bookings"."user_id" is not null),
	CONSTRAINT "bookings_hold_check" CHECK (("bookings"."status" = 'pending_payment') = ("bookings"."hold_expires_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelled_by_user_id_user_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_court_id_starts_at_idx" ON "bookings" USING btree ("court_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_venue_id_starts_at_idx" ON "bookings" USING btree ("venue_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_user_id_starts_at_idx" ON "bookings" USING btree ("user_id","starts_at") WHERE "bookings"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "bookings_venue_id_status_idx" ON "bookings" USING btree ("venue_id","status");--> statement-breakpoint
CREATE INDEX "bookings_status_hold_expires_at_idx" ON "bookings" USING btree ("status","hold_expires_at") WHERE "bookings"."status" = 'pending_payment';