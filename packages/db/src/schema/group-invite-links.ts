import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./user";
import { groups } from "./groups";

export const groupInviteLinks = pgTable("group_invite_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .references(() => groups.id, { onDelete: "restrict" })
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
