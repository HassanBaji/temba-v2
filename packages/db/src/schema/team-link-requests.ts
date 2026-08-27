import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from "./user";
import { teams } from "./teams";
import { communities } from "./communities";

export const teamLinkRequestStatuses = pgEnum("team_link_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export enum TeamLinkRequestStatusEnum {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export const teamLinkRequests = pgTable(
  "team_link_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    communityId: uuid("community_id")
      .references(() => communities.id, { onDelete: "restrict" })
      .notNull(),
    requestedBy: uuid("requested_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    status: teamLinkRequestStatuses()
      .notNull()
      .default(TeamLinkRequestStatusEnum.PENDING),
    decidedBy: uuid("decided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    pendingTeamUnique: uniqueIndex("team_link_requests_pending_team_unique")
      .on(table.teamId)
      .where(sql`${table.status} = 'pending'`),
  }),
);

export const teamLinkRequestRelations = relations(
  teamLinkRequests,
  ({ one }) => ({
    team: one(teams, {
      fields: [teamLinkRequests.teamId],
      references: [teams.id],
    }),
    community: one(communities, {
      fields: [teamLinkRequests.communityId],
      references: [communities.id],
    }),
    requestedBy: one(user, {
      fields: [teamLinkRequests.requestedBy],
      references: [user.id],
      relationName: "teamLinkRequestRequester",
    }),
    decidedBy: one(user, {
      fields: [teamLinkRequests.decidedBy],
      references: [user.id],
      relationName: "teamLinkRequestDecider",
    }),
  }),
);
