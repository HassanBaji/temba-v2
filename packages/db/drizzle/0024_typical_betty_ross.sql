CREATE TABLE "rating_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sport" "group_sport" NOT NULL,
	"match_id" uuid NOT NULL,
	"outcome_score" double precision NOT NULL,
	"weight" double precision NOT NULL,
	"mu_before" double precision NOT NULL,
	"phi_before" double precision NOT NULL,
	"sigma_before" double precision NOT NULL,
	"mu_after" double precision NOT NULL,
	"phi_after" double precision NOT NULL,
	"sigma_after" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rating_events_user_id_match_id_unique" UNIQUE("user_id","match_id")
);
--> statement-breakpoint
ALTER TABLE "rating_events" ADD CONSTRAINT "rating_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_events" ADD CONSTRAINT "rating_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;