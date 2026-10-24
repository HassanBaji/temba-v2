import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from "./user";
import { groups } from "./groups";
import { venues } from "./venues";

export const groupLinkRequestStatuses = pgEnum("group_link_request_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export enum GroupLinkRequestStatusEnum {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export const groupLinkRequests = pgTable(
  "group_link_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    venueId: uuid("venue_id")
      .references(() => venues.id, { onDelete: "restrict" })
      .notNull(),
    requestedBy: uuid("requested_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    status: groupLinkRequestStatuses()
      .notNull()
      .default(GroupLinkRequestStatusEnum.PENDING),
    decidedBy: uuid("decided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    pendingGroupVenueUnique: uniqueIndex("group_link_requests_pending_unique")
      .on(table.groupId, table.venueId)
      .where(sql`${table.status} = 'pending'`),
  }),
);

export const groupLinkRequestRelations = relations(
  groupLinkRequests,
  ({ one }) => ({
    group: one(groups, {
      fields: [groupLinkRequests.groupId],
      references: [groups.id],
    }),
    venue: one(venues, {
      fields: [groupLinkRequests.venueId],
      references: [venues.id],
    }),
    requestedBy: one(user, {
      fields: [groupLinkRequests.requestedBy],
      references: [user.id],
      relationName: "groupLinkRequestRequester",
    }),
    decidedBy: one(user, {
      fields: [groupLinkRequests.decidedBy],
      references: [user.id],
      relationName: "groupLinkRequestDecider",
    }),
  }),
);
