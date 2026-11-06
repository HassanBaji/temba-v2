ALTER TABLE "groups" ADD COLUMN "venue_id" uuid;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
UPDATE "groups" SET "venue_id" = "communities"."venue_id" FROM "communities" WHERE "groups"."community_id" = "communities"."id" AND "communities"."is_venue_community" AND "communities"."venue_id" IS NOT NULL;--> statement-breakpoint
UPDATE "group_join_requests" SET "source" = 'group_page' WHERE "source" = 'community';--> statement-breakpoint
ALTER TABLE "team_link_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "communities" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "community_members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "community_sports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "community_join_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "community_email_invites" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "community_invite_links" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "community_member_invites" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "venue_link_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "groups" DROP CONSTRAINT "groups_community_id_communities_id_fk";
--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_community_id_communities_id_fk";
--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "community_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "community_id";--> statement-breakpoint
DROP TABLE "team_link_requests" CASCADE;--> statement-breakpoint
DROP TABLE "venue_link_requests" CASCADE;--> statement-breakpoint
DROP TABLE "community_members" CASCADE;--> statement-breakpoint
DROP TABLE "community_sports" CASCADE;--> statement-breakpoint
DROP TABLE "community_join_requests" CASCADE;--> statement-breakpoint
DROP TABLE "community_email_invites" CASCADE;--> statement-breakpoint
DROP TABLE "community_invite_links" CASCADE;--> statement-breakpoint
DROP TABLE "community_member_invites" CASCADE;--> statement-breakpoint
DROP TABLE "communities" CASCADE;--> statement-breakpoint
ALTER TABLE "public"."group_join_requests" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."group_join_request_source";--> statement-breakpoint
CREATE TYPE "public"."group_join_request_source" AS ENUM('invite_link', 'group_page');--> statement-breakpoint
ALTER TABLE "public"."group_join_requests" ALTER COLUMN "source" SET DATA TYPE "public"."group_join_request_source" USING "source"::"public"."group_join_request_source";--> statement-breakpoint
DROP TYPE "public"."team_link_request_status";--> statement-breakpoint
DROP TYPE "public"."community_type";--> statement-breakpoint
DROP TYPE "public"."community_role";--> statement-breakpoint
DROP TYPE "public"."community_join_request_status";--> statement-breakpoint
DROP TYPE "public"."venue_link_request_status";
