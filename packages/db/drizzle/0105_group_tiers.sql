CREATE TYPE "public"."tier_band" AS ENUM('safi', 'kanaad', 'hamour', 'shark');--> statement-breakpoint
CREATE TYPE "public"."tier_event_kind" AS ENUM('game', 'adjustment', 'band_change');--> statement-breakpoint
CREATE TABLE "group_tier_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "tier_event_kind" NOT NULL,
	"match_id" uuid,
	"result_delta" integer DEFAULT 0 NOT NULL,
	"performance_delta" integer DEFAULT 0 NOT NULL,
	"delta" integer DEFAULT 0 NOT NULL,
	"points_before" integer NOT NULL,
	"points_after" integer NOT NULL,
	"rating_hundredths" integer,
	"usual_hundredths" integer,
	"expected_score" double precision,
	"band_before" "tier_band",
	"band_after" "tier_band",
	"place_after" integer,
	"ranked_count" integer,
	"set_by_user_id" uuid,
	"reason" "level_override_reason",
	"note" varchar(140),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_tier_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"points" integer DEFAULT 1200 NOT NULL,
	"games_counted" integer DEFAULT 0 NOT NULL,
	"confirmed_at" timestamp,
	"band" "tier_band",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_tier_points_group_id_user_id_unique" UNIQUE("group_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "group_tier_events" ADD CONSTRAINT "group_tier_events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_tier_events" ADD CONSTRAINT "group_tier_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_tier_events" ADD CONSTRAINT "group_tier_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_tier_events" ADD CONSTRAINT "group_tier_events_set_by_user_id_user_id_fk" FOREIGN KEY ("set_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_tier_points" ADD CONSTRAINT "group_tier_points_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_tier_points" ADD CONSTRAINT "group_tier_points_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_tier_events_user_id_match_id_game" ON "group_tier_events" USING btree ("user_id","match_id") WHERE "group_tier_events"."kind" = 'game';--> statement-breakpoint
CREATE INDEX "group_tier_events_user_id_group_id_created_at_idx" ON "group_tier_events" USING btree ("user_id","group_id","created_at");--> statement-breakpoint
CREATE INDEX "group_tier_events_group_id_created_at_idx" ON "group_tier_events" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "group_tier_events_match_id_idx" ON "group_tier_events" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "group_tier_events_set_by_user_id_idx" ON "group_tier_events" USING btree ("set_by_user_id");--> statement-breakpoint
CREATE INDEX "group_tier_points_user_id_idx" ON "group_tier_points" USING btree ("user_id");