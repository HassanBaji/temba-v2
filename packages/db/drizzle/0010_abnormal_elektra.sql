CREATE TABLE "team_email_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"user_id" uuid,
	"invited_by" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_email_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "team_email_invites" ADD CONSTRAINT "team_email_invites_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_email_invites" ADD CONSTRAINT "team_email_invites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_email_invites" ADD CONSTRAINT "team_email_invites_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "team_email_invites_unused_team_email_unique" ON "team_email_invites" USING btree ("team_id","email") WHERE "team_email_invites"."accepted_at" is null and "team_email_invites"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "team_email_invites_unused_team_unique" ON "team_email_invites" USING btree ("team_id") WHERE "team_email_invites"."accepted_at" is null and "team_email_invites"."revoked_at" is null;