import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./user";
import { communities } from "./communities";

export const communityInviteLinks = pgTable("community_invite_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  communityId: uuid("community_id")
    .references(() => communities.id, { onDelete: "restrict" })
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => user.id, { onDelete: "restrict" })
    .notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  revokedAt: timestamp("revoked_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const communityInviteLinkRelations = relations(
  communityInviteLinks,
  ({ one }) => ({
    community: one(communities, {
      fields: [communityInviteLinks.communityId],
      references: [communities.id],
    }),
    createdBy: one(user, {
      fields: [communityInviteLinks.createdBy],
      references: [user.id],
    }),
  }),
);
