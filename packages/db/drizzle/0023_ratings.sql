CREATE TYPE "public"."rating_level_band" AS ENUM('D3', 'D2', 'D1', 'C3', 'C2', 'C1', 'B3', 'B2', 'B1', 'A');--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sport" "group_sport" NOT NULL,
	"mu" double precision NOT NULL,
	"phi" double precision NOT NULL,
	"sigma" double precision NOT NULL,
	"level_band" "rating_level_band" NOT NULL,
	"self_declared_at" timestamp,
	"last_rated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_user_id_sport_unique" UNIQUE("user_id","sport")
);
--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;