ALTER TYPE "public"."notification_type" ADD VALUE 'performance_ratings_open';--> statement-breakpoint
CREATE TABLE "match_rating_windows" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"closes_at" timestamp NOT NULL,
	"settled_at" timestamp,
	"suspended_at" timestamp,
	"mode" "performance_rating_mode" NOT NULL,
	"weight_percent" integer NOT NULL,
	"organizer_counts_double" boolean DEFAULT false NOT NULL,
	"counts_for_level" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_rating_windows_mode_check" CHECK ("match_rating_windows"."mode" <> 'off'),
	CONSTRAINT "match_rating_windows_weight_percent_check" CHECK ("match_rating_windows"."weight_percent" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "performance_rating_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating_hundredths" integer NOT NULL,
	"ballots_counted" integer NOT NULL,
	"game_average_hundredths" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "performance_rating_results_match_user_unique" UNIQUE("match_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "performance_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"rater_user_id" uuid NOT NULL,
	"ratee_user_id" uuid NOT NULL,
	"value" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "performance_ratings_match_rater_ratee_unique" UNIQUE("match_id","rater_user_id","ratee_user_id"),
	CONSTRAINT "performance_ratings_value_check" CHECK ("performance_ratings"."value" between 1 and 10),
	CONSTRAINT "performance_ratings_not_self_check" CHECK ("performance_ratings"."rater_user_id" <> "performance_ratings"."ratee_user_id")
);
--> statement-breakpoint
ALTER TABLE "match_rating_windows" ADD CONSTRAINT "match_rating_windows_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_rating_results" ADD CONSTRAINT "performance_rating_results_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_rating_results" ADD CONSTRAINT "performance_rating_results_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_ratings" ADD CONSTRAINT "performance_ratings_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_ratings" ADD CONSTRAINT "performance_ratings_rater_user_id_user_id_fk" FOREIGN KEY ("rater_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_ratings" ADD CONSTRAINT "performance_ratings_ratee_user_id_user_id_fk" FOREIGN KEY ("ratee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "performance_rating_results_user_id_idx" ON "performance_rating_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "performance_ratings_rater_user_id_idx" ON "performance_ratings" USING btree ("rater_user_id");--> statement-breakpoint
CREATE INDEX "performance_ratings_ratee_user_id_idx" ON "performance_ratings" USING btree ("ratee_user_id");