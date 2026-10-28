import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { courts } from "./courts";
import { user } from "./user";
import { venues } from "./venues";

export const venueClosures = pgTable(
  "venue_closures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .references(() => venues.id, { onDelete: "cascade" })
      .notNull(),
    courtId: uuid("court_id").references(() => courts.id, {
      onDelete: "cascade",
    }),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    reason: varchar("reason", { length: 255 }),
    createdByUserId: uuid("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    venueStartsIdx: index("venue_closures_venue_id_starts_at_idx").on(
      table.venueId,
      table.startsAt,
    ),
    rangeCheck: check(
      "venue_closures_range_check",
      sql`${table.startsAt} < ${table.endsAt}`,
    ),
  }),
);

export const venueClosuresRelations = relations(venueClosures, ({ one }) => ({
  venue: one(venues, {
    fields: [venueClosures.venueId],
    references: [venues.id],
  }),
  court: one(courts, {
    fields: [venueClosures.courtId],
    references: [courts.id],
  }),
}));
