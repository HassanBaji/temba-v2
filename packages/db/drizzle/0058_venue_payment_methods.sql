ALTER TYPE "public"."payment_method" ADD VALUE 'benefitpay';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'apple_pay';--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "pay_at_venue_allowed" boolean DEFAULT true NOT NULL;