CREATE TABLE "match_result_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"confirmed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_result_confirmations_match_id_user_id_unique" UNIQUE("match_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "match_result_confirmations" ADD CONSTRAINT "match_result_confirmations_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_result_confirmations" ADD CONSTRAINT "match_result_confirmations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;