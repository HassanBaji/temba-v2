import {
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";
import { groups } from "./groups";
import {
  GroupMemberRoleEnum,
  groupMemberRoles,
  memberNicknameVisibilities,
} from "./group-enums";
import { relations } from "drizzle-orm";

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    role: groupMemberRoles().notNull().default(GroupMemberRoleEnum.MEMBER),
    totalGamesPlayed: integer("total_games_played").notNull().default(0),
    totalPointsWon: integer("total_points_won").notNull().default(0),
    totalSetsWon: integer("total_sets_won").notNull().default(0),
    /** The Member nickname a Group approver gave this member, in this Group only. */
    nickname: varchar("nickname", { length: 24 }),
    nicknameVisibility: memberNicknameVisibilities("nickname_visibility")
      .notNull()
      .default("approvers"),
    nicknameUpdatedById: uuid("nickname_updated_by_id").references(
      () => user.id,
      { onDelete: "set null" },
    ),
    nicknameUpdatedAt: timestamp("nickname_updated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueGroupUser: unique("group_members_group_id_user_id_unique").on(
      table.groupId,
      table.userId,
    ),
    userIdx: index("group_members_user_id_idx").on(table.userId),
  }),
);

export const groupMemberRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(user, { fields: [groupMembers.userId], references: [user.id] }),
}));
