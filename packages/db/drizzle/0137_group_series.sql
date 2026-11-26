CREATE TYPE "public"."series_colour" AS ENUM('gold', 'red', 'blue', 'green', 'purple', 'teal');--> statement-breakpoint
CREATE TYPE "public"."series_emblem" AS ENUM('cup', 'crown', 'star', 'bolt', 'flame', 'moon', 'ball');--> statement-breakpoint
CREATE TABLE "group_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"emblem" "series_emblem" NOT NULL,
	"colour" "series_colour" NOT NULL,
	"ended_at" timestamp,
	"ended_by" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "group_series" ADD CONSTRAINT "group_series_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_series" ADD CONSTRAINT "group_series_ended_by_user_id_fk" FOREIGN KEY ("ended_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_series" ADD CONSTRAINT "group_series_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_series_group_id_idx" ON "group_series" USING btree ("group_id");--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_series_id_group_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."group_series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_series_id_window_start_idx" ON "games" USING btree ("series_id","window_start");