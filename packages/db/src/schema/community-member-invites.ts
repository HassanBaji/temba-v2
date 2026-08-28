import { pgTable, uuid, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from "./user";
import { communities } from "./communities";

export const communityMemberInvites = pgTable(
  "community_member_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .references(() => communities.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    invitedBy: uuid("invited_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    unusedCommunityUserUnique: uniqueIndex(
      "community_member_invites_unused_community_user_unique",
    )
      .on(table.communityId, table.userId)
      .where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
  }),
);

export const communityMemberInviteRelations = relations(
  communityMemberInvites,
  ({ one }) => ({
    community: one(communities, {
      fields: [communityMemberInvites.communityId],
      references: [communities.id],
    }),
    user: one(user, {
      fields: [communityMemberInvites.userId],
      references: [user.id],
    }),
    invitedBy: one(user, {
      fields: [communityMemberInvites.invitedBy],
      references: [user.id],
      relationName: "communityMemberInviteInviter",
    }),
  }),
);
