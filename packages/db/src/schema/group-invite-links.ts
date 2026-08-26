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

export const groupInviteLinks = pgTable(
  "group_invite_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "restrict" })
      .notNull(),
    createdBy: uuid("created_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    activeGroupUnique: uniqueIndex("group_invite_links_active_group_unique")
      .on(table.groupId)
      .where(sql`${table.revokedAt} is null`),
  }),
);

export const groupInviteLinkRelations = relations(
  groupInviteLinks,
  ({ one }) => ({
    group: one(groups, {
      fields: [groupInviteLinks.groupId],
      references: [groups.id],
    }),
    createdBy: one(user, {
      fields: [groupInviteLinks.createdBy],
      references: [user.id],
    }),
  }),
);
