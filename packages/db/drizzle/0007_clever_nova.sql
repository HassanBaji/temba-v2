CREATE TABLE "group_email_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"user_id" uuid,
	"invited_by" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_email_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "group_invite_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_invite_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "group_email_invites" ADD CONSTRAINT "group_email_invites_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_email_invites" ADD CONSTRAINT "group_email_invites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_email_invites" ADD CONSTRAINT "group_email_invites_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invite_links" ADD CONSTRAINT "group_invite_links_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invite_links" ADD CONSTRAINT "group_invite_links_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_email_invites_unused_group_email_unique" ON "group_email_invites" USING btree ("group_id","email") WHERE "group_email_invites"."accepted_at" is null and "group_email_invites"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "group_invite_links_active_group_unique" ON "group_invite_links" USING btree ("group_id") WHERE "group_invite_links"."revoked_at" is null;