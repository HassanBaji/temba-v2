import { relations } from "drizzle-orm";
import { index, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { user } from "./user";
import { venues } from "./venues";

export const venueManagers = pgTable(
  "venue_managers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .references(() => venues.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    grantedByUserId: uuid("granted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueVenueUser: unique("venue_managers_venue_id_user_id_unique").on(
      table.venueId,
      table.userId,
    ),
    userIdx: index("venue_managers_user_id_idx").on(table.userId),
  }),
);

export const venueManagerRelations = relations(venueManagers, ({ one }) => ({
  venue: one(venues, {
    fields: [venueManagers.venueId],
    references: [venues.id],
  }),
  user: one(user, {
    fields: [venueManagers.userId],
    references: [user.id],
    relationName: "venueManagerUser",
  }),
  grantedBy: one(user, {
    fields: [venueManagers.grantedByUserId],
    references: [user.id],
    relationName: "venueManagerGrantedBy",
  }),
}));
