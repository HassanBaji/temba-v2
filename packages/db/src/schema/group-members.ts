import { pgTable, uuid, timestamp, integer } from "drizzle-orm/pg-core";
import { user } from "./user";
import { groups } from "./groups";
import { relations } from "drizzle-orm";

export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .references(() => groups.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  totalGamesPlayed: integer("total_games_played").notNull().default(0),
  totalPointsWon: integer("total_points_won").notNull().default(0),
  totalSetsWon: integer("total_sets_won").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupMemberRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(user, { fields: [groupMembers.userId], references: [user.id] }),
}));
