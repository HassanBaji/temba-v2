import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from "./user";
import { groups } from "./groups";

export const groupMemberInvites = pgTable(
  "group_member_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
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
    unusedGroupUserUnique: uniqueIndex(
      "group_member_invites_unused_group_user_unique",
    )
      .on(table.groupId, table.userId)
      .where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
  }),
);

export const groupMemberInviteRelations = relations(
  groupMemberInvites,
  ({ one }) => ({
    group: one(groups, {
      fields: [groupMemberInvites.groupId],
      references: [groups.id],
    }),
    user: one(user, {
      fields: [groupMemberInvites.userId],
      references: [user.id],
    }),
    invitedBy: one(user, {
      fields: [groupMemberInvites.invitedBy],
      references: [user.id],
      relationName: "groupMemberInviteInviter",
    }),
  }),
);
