import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./user";
import { communityMembers } from "./community-members";
import { communitySports } from "./community-sports";
import { communityJoinRequests } from "./community-join-requests";
import { communityEmailInvites } from "./community-email-invites";
import { communityInviteLinks } from "./community-invite-links";
import { venues } from "./venues";

export const communityTypes = pgEnum("community_type", ["public", "private"]);

export enum CommunityTypeEnum {
  PUBLIC = "public",
  PRIVATE = "private",
}

export const communities = pgTable("communities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
  type: communityTypes().notNull().default(CommunityTypeEnum.PRIVATE),
  createdBy: uuid("created_by")
    .references(() => user.id, { onDelete: "restrict" })
    .notNull(),
  archivedAt: timestamp("archived_at"),
  venueId: uuid("venue_id").references(() => venues.id, {
    onDelete: "restrict",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const communityRelations = relations(communities, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [communities.createdBy],
    references: [user.id],
  }),
  venue: one(venues, {
    fields: [communities.venueId],
    references: [venues.id],
  }),
  members: many(communityMembers),
  sports: many(communitySports),
  joinRequests: many(communityJoinRequests),
  emailInvites: many(communityEmailInvites),
  inviteLinks: many(communityInviteLinks),
}));
