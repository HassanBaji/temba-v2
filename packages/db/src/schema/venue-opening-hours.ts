import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  smallint,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { venues } from "./venues";

export const venueOpeningHours = pgTable(
  "venue_opening_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .references(() => venues.id, { onDelete: "cascade" })
      .notNull(),
    weekday: smallint("weekday").notNull(),
    opensAtMinutes: integer("opens_at_minutes").notNull(),
    closesAtMinutes: integer("closes_at_minutes").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    venueWeekdayIdx: index("venue_opening_hours_venue_id_weekday_idx").on(
      table.venueId,
      table.weekday,
    ),
    weekdayCheck: check(
      "venue_opening_hours_weekday_check",
      sql`${table.weekday} between 0 and 6`,
    ),
    windowCheck: check(
      "venue_opening_hours_window_check",
      sql`${table.opensAtMinutes} >= 0 and ${table.opensAtMinutes} < ${table.closesAtMinutes} and ${table.closesAtMinutes} <= 1800`,
    ),
  }),
);

export const venueOpeningHoursRelations = relations(
  venueOpeningHours,
  ({ one }) => ({
    venue: one(venues, {
      fields: [venueOpeningHours.venueId],
      references: [venues.id],
    }),
  }),
);
