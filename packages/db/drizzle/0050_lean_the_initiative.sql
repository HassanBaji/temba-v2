CREATE TYPE "public"."level_override_reason" AS ENUM('new_to_group', 'plays_above_results', 'plays_below_results', 'back_from_injury', 'correcting_a_mistake');--> statement-breakpoint
CREATE TABLE "level_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sport" "group_sport" NOT NULL,
	"set_by_user_id" uuid NOT NULL,
	"group_id" uuid,
	"reason" "level_override_reason",
	"had_rating" boolean NOT NULL,
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
ALTER TABLE "level_overrides" ADD CONSTRAINT "level_overrides_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_overrides" ADD CONSTRAINT "level_overrides_set_by_user_id_user_id_fk" FOREIGN KEY ("set_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_overrides" ADD CONSTRAINT "level_overrides_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "level_overrides_user_id_sport_created_at_idx" ON "level_overrides" USING btree ("user_id","sport","created_at");