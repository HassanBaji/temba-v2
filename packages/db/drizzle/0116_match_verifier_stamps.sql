CREATE TABLE "match_verifier_stamps" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"verifier_user_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_verifier_stamps" ADD CONSTRAINT "match_verifier_stamps_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_verifier_stamps" ADD CONSTRAINT "match_verifier_stamps_verifier_user_id_user_id_fk" FOREIGN KEY ("verifier_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_verifier_stamps" ADD CONSTRAINT "match_verifier_stamps_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;