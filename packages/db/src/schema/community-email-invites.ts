import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from "./user";
import { communities } from "./communities";

export const communityEmailInvites = pgTable(
  "community_email_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .references(() => communities.id, { onDelete: "restrict" })
      .notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    userId: uuid("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    invitedBy: uuid("invited_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    unusedCommunityEmailUnique: uniqueIndex(
      "community_email_invites_unused_community_email_unique",
    )
      .on(table.communityId, table.email)
      .where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
  }),
);

export const communityEmailInviteRelations = relations(
  communityEmailInvites,
  ({ one }) => ({
    community: one(communities, {
      fields: [communityEmailInvites.communityId],
      references: [communities.id],
    }),
    user: one(user, {
      fields: [communityEmailInvites.userId],
      references: [user.id],
    }),
    invitedBy: one(user, {
      fields: [communityEmailInvites.invitedBy],
      references: [user.id],
      relationName: "communityEmailInviteInviter",
    }),
  }),
);
