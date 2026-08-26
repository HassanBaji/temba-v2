CREATE TABLE "community_email_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"user_id" uuid,
	"invited_by" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_email_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "community_invite_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_invite_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "community_email_invites" ADD CONSTRAINT "community_email_invites_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_email_invites" ADD CONSTRAINT "community_email_invites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_email_invites" ADD CONSTRAINT "community_email_invites_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_invite_links" ADD CONSTRAINT "community_invite_links_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_invite_links" ADD CONSTRAINT "community_invite_links_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_email_invites_unused_community_email_unique" ON "community_email_invites" USING btree ("community_id","email") WHERE "community_email_invites"."accepted_at" is null and "community_email_invites"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "community_invite_links_active_community_unique" ON "community_invite_links" USING btree ("community_id") WHERE "community_invite_links"."revoked_at" is null;