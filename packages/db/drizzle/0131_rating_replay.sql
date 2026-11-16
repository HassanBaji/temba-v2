CREATE TABLE "rating_replay_backups" (
	"run_id" uuid NOT NULL,
	"table_name" text NOT NULL,
	"row_id" uuid NOT NULL,
	"row" jsonb NOT NULL,
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
ALTER TABLE "rating_replay_backups" ADD CONSTRAINT "rating_replay_backups_run_id_rating_replay_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."rating_replay_runs"("id") ON DELETE cascade ON UPDATE no action;