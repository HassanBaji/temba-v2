CREATE TYPE "public"."match_history_visibility" AS ENUM('everyone', 'group_members', 'only_me');--> statement-breakpoint
CREATE TYPE "public"."play_window" AS ENUM('weekday_morning', 'weekday_afternoon', 'weekday_evening', 'weekend_morning', 'weekend_afternoon', 'weekend_evening');--> statement-breakpoint
CREATE TYPE "public"."user_gender" AS ENUM('male', 'female', 'unspecified');--> statement-breakpoint
CREATE TABLE "group_level_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"set_by_user_id" uuid NOT NULL,
	"mu_before" double precision NOT NULL,
	"phi_before" double precision NOT NULL,
	"sigma_before" double precision NOT NULL,
	"level_band_before" "rating_level_band" NOT NULL,
	"mu_after" double precision NOT NULL,
	"phi_after" double precision NOT NULL,
	"sigma_after" double precision NOT NULL,
	"level_band_after" "rating_level_band" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_rating_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
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
	CONSTRAINT "group_rating_events_user_id_match_id_unique" UNIQUE("user_id","match_id")
);
--> statement-breakpoint
CREATE TABLE "group_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"mu" double precision NOT NULL,
	"phi" double precision NOT NULL,
	"sigma" double precision NOT NULL,
	"level_band" "rating_level_band" NOT NULL,
	"last_rated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_ratings_user_id_group_id_unique" UNIQUE("user_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "gender" "user_gender";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "home_area" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "nationality" varchar(2);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "play_windows" "play_window"[];--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "seat_alerts" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "match_history_visibility" "match_history_visibility" DEFAULT 'everyone' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "group_rated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "group_level_overrides" ADD CONSTRAINT "group_level_overrides_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_level_overrides" ADD CONSTRAINT "group_level_overrides_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_level_overrides" ADD CONSTRAINT "group_level_overrides_set_by_user_id_user_id_fk" FOREIGN KEY ("set_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_rating_events" ADD CONSTRAINT "group_rating_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_rating_events" ADD CONSTRAINT "group_rating_events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_rating_events" ADD CONSTRAINT "group_rating_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_ratings" ADD CONSTRAINT "group_ratings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_ratings" ADD CONSTRAINT "group_ratings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_level_overrides_user_id_group_id_created_at_idx" ON "group_level_overrides" USING btree ("user_id","group_id","created_at");--> statement-breakpoint
CREATE INDEX "group_rating_events_user_id_group_id_created_at_idx" ON "group_rating_events" USING btree ("user_id","group_id","created_at");--> statement-breakpoint
CREATE INDEX "group_ratings_group_id_idx" ON "group_ratings" USING btree ("group_id");