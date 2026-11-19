ALTER TYPE "public"."notification_type" ADD VALUE 'level_recalculated';--> statement-breakpoint
CREATE TABLE "level_check_ballots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"rater_user_id" uuid NOT NULL,
	"ratee_user_id" uuid NOT NULL,
	"band" "rating_level_band" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "level_check_ballots_match_rater_ratee_unique" UNIQUE("match_id","rater_user_id","ratee_user_id"),
	CONSTRAINT "level_check_ballots_not_self_check" CHECK ("level_check_ballots"."rater_user_id" <> "level_check_ballots"."ratee_user_id")
);
--> statement-breakpoint
CREATE TABLE "level_check_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sport" "group_sport" NOT NULL,
	"match_id" uuid NOT NULL,
	"verdict_level_hundredths" integer NOT NULL,
	"agreed" boolean NOT NULL,
	"ballots_counted" integer NOT NULL,
	"weight" double precision NOT NULL,
	"mu_before" double precision NOT NULL,
	"phi_before" double precision NOT NULL,
	"mu_after" double precision NOT NULL,
	"phi_after" double precision NOT NULL,
	"level_band_before" "rating_level_band" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "level_check_results_user_id_match_id_unique" UNIQUE("user_id","match_id")
);
--> statement-breakpoint
CREATE TABLE "rating_replay_backups" (
	"run_id" uuid NOT NULL,
	"table_name" text NOT NULL,
	"row_id" uuid NOT NULL,
	"row" jsonb NOT NULL,
	"written" jsonb NOT NULL,
	CONSTRAINT "rating_replay_backups_run_id_table_name_row_id_pk" PRIMARY KEY("run_id","table_name","row_id")
);
--> statement-breakpoint
CREATE TABLE "rating_replay_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"rules" text NOT NULL,
	"summary" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rating_events" ADD COLUMN "prove_it_part" double precision;--> statement-breakpoint
ALTER TABLE "rating_events" ADD COLUMN "reliability_loss_factor" double precision;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "declared_band" "rating_level_band";--> statement-breakpoint
ALTER TABLE "level_check_ballots" ADD CONSTRAINT "level_check_ballots_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_check_ballots" ADD CONSTRAINT "level_check_ballots_rater_user_id_user_id_fk" FOREIGN KEY ("rater_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_check_ballots" ADD CONSTRAINT "level_check_ballots_ratee_user_id_user_id_fk" FOREIGN KEY ("ratee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_check_results" ADD CONSTRAINT "level_check_results_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_check_results" ADD CONSTRAINT "level_check_results_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_replay_backups" ADD CONSTRAINT "rating_replay_backups_run_id_rating_replay_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."rating_replay_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "level_check_ballots_rater_user_id_idx" ON "level_check_ballots" USING btree ("rater_user_id");--> statement-breakpoint
CREATE INDEX "level_check_ballots_ratee_user_id_idx" ON "level_check_ballots" USING btree ("ratee_user_id");--> statement-breakpoint
CREATE INDEX "level_check_results_match_id_idx" ON "level_check_results" USING btree ("match_id");