CREATE TYPE "public"."venue_verifier_kind" AS ENUM('club_staff', 'referee', 'coach');--> statement-breakpoint
CREATE TABLE "venue_verifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "venue_verifier_kind" NOT NULL,
	"granted_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "venue_verifiers_venue_id_user_id_unique" UNIQUE("venue_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "level_overrides" ADD COLUMN "venue_id" uuid;--> statement-breakpoint
ALTER TABLE "venue_verifiers" ADD CONSTRAINT "venue_verifiers_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_verifiers" ADD CONSTRAINT "venue_verifiers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_verifiers" ADD CONSTRAINT "venue_verifiers_granted_by_user_id_user_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "venue_verifiers_user_id_idx" ON "venue_verifiers" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "level_overrides" ADD CONSTRAINT "level_overrides_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;