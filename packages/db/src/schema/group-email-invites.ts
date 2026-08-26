import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from "./user";
import { groups } from "./groups";

export const groupEmailInvites = pgTable(
  "group_email_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "restrict" })
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
    unusedGroupEmailUnique: uniqueIndex(
      "group_email_invites_unused_group_email_unique",
    )
      .on(table.groupId, table.email)
      .where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
  }),
);

export const groupEmailInviteRelations = relations(
  groupEmailInvites,
  ({ one }) => ({
    group: one(groups, {
      fields: [groupEmailInvites.groupId],
      references: [groups.id],
    }),
    user: one(user, {
      fields: [groupEmailInvites.userId],
      references: [user.id],
    }),
    invitedBy: one(user, {
      fields: [groupEmailInvites.invitedBy],
      references: [user.id],
      relationName: "groupEmailInviteInviter",
    }),
  }),
);
