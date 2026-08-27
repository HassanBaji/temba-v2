import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from "./user";
import { communities } from "./communities";
import { venues } from "./venues";

export const venueLinkRequestStatuses = pgEnum("venue_link_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export enum VenueLinkRequestStatusEnum {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export const venueLinkRequests = pgTable(
  "venue_link_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .references(() => communities.id, { onDelete: "restrict" })
      .notNull(),
    venueId: uuid("venue_id")
      .references(() => venues.id, { onDelete: "restrict" })
      .notNull(),
    requestedBy: uuid("requested_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    status: venueLinkRequestStatuses()
      .notNull()
      .default(VenueLinkRequestStatusEnum.PENDING),
    decidedBy: uuid("decided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    pendingCommunityUnique: uniqueIndex(
      "venue_link_requests_pending_community_unique",
    )
      .on(table.communityId)
      .where(sql`${table.status} = 'pending'`),
  }),
);

export const venueLinkRequestRelations = relations(
  venueLinkRequests,
  ({ one }) => ({
    community: one(communities, {
      fields: [venueLinkRequests.communityId],
      references: [communities.id],
    }),
    venue: one(venues, {
      fields: [venueLinkRequests.venueId],
      references: [venues.id],
    }),
    requestedBy: one(user, {
      fields: [venueLinkRequests.requestedBy],
      references: [user.id],
      relationName: "venueLinkRequestRequester",
    }),
    decidedBy: one(user, {
      fields: [venueLinkRequests.decidedBy],
      references: [user.id],
      relationName: "venueLinkRequestDecider",
    }),
  }),
);
