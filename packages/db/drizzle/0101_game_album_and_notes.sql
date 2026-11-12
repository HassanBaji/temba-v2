CREATE TYPE "public"."game_note_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "game_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"body" varchar(300) NOT NULL,
	"visibility" "game_note_visibility" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_notes_game_author_unique" UNIQUE("game_id","author_user_id"),
	CONSTRAINT "game_notes_body_not_blank_check" CHECK (length(btrim("game_notes"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "game_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"uploader_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_notes" ADD CONSTRAINT "game_notes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_notes" ADD CONSTRAINT "game_notes_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_photos" ADD CONSTRAINT "game_photos_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_photos" ADD CONSTRAINT "game_photos_uploader_user_id_user_id_fk" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_notes_author_user_id_created_at_idx" ON "game_notes" USING btree ("author_user_id","created_at");--> statement-breakpoint
CREATE INDEX "game_photos_game_id_created_at_idx" ON "game_photos" USING btree ("game_id","created_at");--> statement-breakpoint
CREATE INDEX "game_photos_uploader_user_id_idx" ON "game_photos" USING btree ("uploader_user_id");