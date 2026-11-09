CREATE TYPE "public"."challenge_status" AS ENUM('open', 'confirmed', 'expired', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."challenge_timing" AS ENUM('morning', 'afternoon', 'evening');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('pending', 'confirmed', 'declined', 'withdrawn', 'expired', 'passed_over');--> statement-breakpoint
CREATE TYPE "public"."weekday" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'challenge_expired';--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"sport" "group_sport" NOT NULL,
	"status" "challenge_status" DEFAULT 'open' NOT NULL,
	"posted_by" uuid NOT NULL,
	"level_min_tenths" integer,
	"level_max_tenths" integer,
	"days" "weekday"[] DEFAULT '{}' NOT NULL,
	"timings" "challenge_timing"[] DEFAULT '{}' NOT NULL,
	"exact_slots" timestamp[] DEFAULT '{}' NOT NULL,
	"duration_minutes" integer NOT NULL,
	"side_size" integer,
	"note" varchar(140),
	"nudge_team_id" uuid,
	"expires_at" timestamp NOT NULL,
	"confirmed_proposal_id" uuid,
	"game_id" uuid,
	"withdrawn_at" timestamp,
	"expired_at" timestamp,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "challenges_side_size_check" CHECK ("challenges"."side_size" is null or "challenges"."side_size" in (5, 6, 7))
);
--> statement-breakpoint
CREATE TABLE "challenge_venues" (
	"challenge_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "challenge_venues_challenge_id_venue_id_pk" PRIMARY KEY("challenge_id","venue_id")
);
--> statement-breakpoint
CREATE TABLE "challenge_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"proposed_by" uuid NOT NULL,
	"status" "proposal_status" DEFAULT 'pending' NOT NULL,
	"venue_id" uuid NOT NULL,
	"court_id" uuid,
	"starts_at" timestamp NOT NULL,
	"price_per_player_fils" integer,
	"expires_at" timestamp NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "challenge_id" uuid;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_posted_by_user_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_nudge_team_id_teams_id_fk" FOREIGN KEY ("nudge_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_confirmed_proposal_id_challenge_proposals_id_fk" FOREIGN KEY ("confirmed_proposal_id") REFERENCES "public"."challenge_proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_venues" ADD CONSTRAINT "challenge_venues_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_venues" ADD CONSTRAINT "challenge_venues_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_proposals" ADD CONSTRAINT "challenge_proposals_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_proposals" ADD CONSTRAINT "challenge_proposals_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_proposals" ADD CONSTRAINT "challenge_proposals_proposed_by_user_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_proposals" ADD CONSTRAINT "challenge_proposals_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_proposals" ADD CONSTRAINT "challenge_proposals_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_proposals" ADD CONSTRAINT "challenge_proposals_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenges_open_board_idx" ON "challenges" USING btree ("status","sport","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "challenges_team_open_uq" ON "challenges" USING btree ("team_id") WHERE "challenges"."status" = 'open';--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_pending_team_uq" ON "challenge_proposals" USING btree ("challenge_id","team_id") WHERE "challenge_proposals"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "proposals_challenge_idx" ON "challenge_proposals" USING btree ("challenge_id","status");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;