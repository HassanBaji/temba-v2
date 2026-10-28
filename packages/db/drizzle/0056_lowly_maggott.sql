CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'benefit', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('manual', 'tap');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'waived');--> statement-breakpoint
CREATE TABLE "booking_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"method" "payment_method",
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_fils" integer NOT NULL,
	"provider_reference" varchar(255),
	"client_redirect_url" varchar(2048),
	"provider_status" varchar(64),
	"failure_reason" varchar(500),
	"settled_by_user_id" uuid,
	"settled_at" timestamp,
	"refunded_fils" integer DEFAULT 0 NOT NULL,
	"refund_reference" varchar(255),
	"refunded_by_user_id" uuid,
	"refunded_at" timestamp,
	"refund_failure_reason" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "booking_payments_refunded_check" CHECK ("booking_payments"."refunded_fils" >= 0 and "booking_payments"."refunded_fils" <= "booking_payments"."amount_fils")
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"delivery_key" varchar(255) NOT NULL,
	"reference" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"headers" jsonb NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"error" varchar(500),
	CONSTRAINT "payment_webhook_deliveries_key_unique" UNIQUE("provider","delivery_key")
);
--> statement-breakpoint
ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_settled_by_user_id_user_id_fk" FOREIGN KEY ("settled_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_refunded_by_user_id_user_id_fk" FOREIGN KEY ("refunded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_payments_booking_id_idx" ON "booking_payments" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_payments_provider_reference_unique" ON "booking_payments" USING btree ("provider","provider_reference") WHERE "booking_payments"."provider_reference" is not null;