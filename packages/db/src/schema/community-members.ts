import { pgTable, uuid, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./user";
import { communities } from "./communities";

export const communityRoles = pgEnum("community_role", [
  "owner",
  "admin",
  "member",
]);

export enum CommunityRoleEnum {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
}

export const communityMembers = pgTable(
  "community_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .references(() => communities.id, { onDelete: "restrict" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    role: communityRoles().notNull().default(CommunityRoleEnum.MEMBER),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueCommunityUser: unique(
      "community_members_community_id_user_id_unique",
    ).on(table.communityId, table.userId),
  }),
);

export const communityMemberRelations = relations(
  communityMembers,
  ({ one }) => ({
    community: one(communities, {
      fields: [communityMembers.communityId],
      references: [communities.id],
    }),
    user: one(user, {
      fields: [communityMembers.userId],
      references: [user.id],
    }),
  }),
);
