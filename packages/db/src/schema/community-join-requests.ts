import { pgTable, uuid, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./user";
import { communities } from "./communities";

export const communityJoinRequestStatuses = pgEnum(
  "community_join_request_status",
  ["pending", "approved", "rejected"],
);

export enum CommunityJoinRequestStatusEnum {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export const communityJoinRequests = pgTable(
  "community_join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .references(() => communities.id, { onDelete: "restrict" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: communityJoinRequestStatuses()
      .notNull()
      .default(CommunityJoinRequestStatusEnum.PENDING),
    decidedBy: uuid("decided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueCommunityUser: unique(
      "community_join_requests_community_id_user_id_unique",
    ).on(table.communityId, table.userId),
  }),
);

export const communityJoinRequestRelations = relations(
  communityJoinRequests,
  ({ one }) => ({
    community: one(communities, {
      fields: [communityJoinRequests.communityId],
      references: [communities.id],
    }),
    user: one(user, {
      fields: [communityJoinRequests.userId],
      references: [user.id],
    }),
  }),
);
