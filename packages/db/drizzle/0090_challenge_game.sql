ALTER TYPE "public"."notification_type" ADD VALUE 'challenge_proposal_confirmed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'challenge_proposal_passed_over';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'challenge_squad_due';--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "challenge_id" uuid;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE set null ON UPDATE no action;