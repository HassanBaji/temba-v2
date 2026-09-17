import { pgTable, uuid, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./user";
import { groups } from "./groups";

export const groupJoinRequestStatuses = pgEnum("group_join_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export enum GroupJoinRequestStatusEnum {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export const groupJoinRequests = pgTable(
  "group_join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, {
        onDelete: "cascade",
      })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: groupJoinRequestStatuses()
      .notNull()
      .default(GroupJoinRequestStatusEnum.PENDING),
    decidedBy: uuid("decided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueGroupUser: unique("group_join_requests_group_id_user_id_unique").on(
      table.groupId,
      table.userId,
    ),
  }),
);

export const groupJoinRequestRelations = relations(
  groupJoinRequests,
  ({ one }) => ({
    group: one(groups, {
      fields: [groupJoinRequests.groupId],
      references: [groups.id],
    }),
    user: one(user, {
      fields: [groupJoinRequests.userId],
      references: [user.id],
    }),
  }),
);
