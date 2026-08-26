ALTER TABLE "games" DROP CONSTRAINT "games_group_id_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_user_id_unique" UNIQUE("group_id","user_id");