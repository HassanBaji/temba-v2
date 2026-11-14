CREATE TYPE "public"."game_payment_return_reason" AS ENUM('nothing_arrived', 'wrong_amount', 'sent_elsewhere');--> statement-breakpoint
CREATE TYPE "public"."game_payment_status" AS ENUM('claimed', 'paid', 'not_received');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'game_payment_reminder';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'game_payment_not_received';--> statement-breakpoint
CREATE TABLE "game_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "game_payment_status" NOT NULL,
	"claimed_at" timestamp,
	"paid_at" timestamp,
	"paid_by_user_id" uuid,
	"returned_at" timestamp,
	"returned_by_user_id" uuid,
	"return_reason" "game_payment_return_reason",
	"return_note" varchar(200),
	"updated_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_payments_game_id_user_id_unique" UNIQUE("game_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "track_payments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "keepers_play_free" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game_payments" ADD CONSTRAINT "game_payments_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_payments" ADD CONSTRAINT "game_payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_payments" ADD CONSTRAINT "game_payments_paid_by_user_id_user_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_payments" ADD CONSTRAINT "game_payments_returned_by_user_id_user_id_fk" FOREIGN KEY ("returned_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_payments" ADD CONSTRAINT "game_payments_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_payments_user_id_idx" ON "game_payments" USING btree ("user_id");