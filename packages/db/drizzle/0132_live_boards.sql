CREATE TYPE "public"."live_board_screen" AS ENUM('on_court', 'standings', 'next_up');--> statement-breakpoint
CREATE TYPE "public"."live_board_theme" AS ENUM('dark', 'light');--> statement-breakpoint
CREATE TABLE "live_board_tvs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"token" varchar(64) NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"disconnected_at" timestamp,
	CONSTRAINT "live_board_tvs_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "live_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"code" varchar(6) NOT NULL,
	"created_by" uuid NOT NULL,
	"rotate" boolean DEFAULT true NOT NULL,
	"rotate_seconds" integer DEFAULT 10 NOT NULL,
	"held_screen" "live_board_screen" DEFAULT 'on_court' NOT NULL,
	"rotation_started_at" timestamp DEFAULT now() NOT NULL,
	"theme" "live_board_theme" DEFAULT 'dark' NOT NULL,
	"show_qr" boolean DEFAULT true NOT NULL,
	"message" varchar(80),
	"message_shown" boolean DEFAULT false NOT NULL,
	"stopped_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "live_board_tvs" ADD CONSTRAINT "live_board_tvs_board_id_live_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."live_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_boards" ADD CONSTRAINT "live_boards_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_boards" ADD CONSTRAINT "live_boards_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "live_board_tvs_board_id_idx" ON "live_board_tvs" USING btree ("board_id");--> statement-breakpoint
CREATE UNIQUE INDEX "live_boards_running_code_unique" ON "live_boards" USING btree ("code") WHERE "live_boards"."stopped_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "live_boards_running_game_unique" ON "live_boards" USING btree ("game_id") WHERE "live_boards"."stopped_at" is null;--> statement-breakpoint
CREATE INDEX "live_boards_game_id_idx" ON "live_boards" USING btree ("game_id");