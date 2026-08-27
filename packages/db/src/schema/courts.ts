import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { venues } from "./venues";

/**
 * Named playing surface on a Venue. Games still point at the Venue row
 * (ADR-0007); deleting a Court must not cascade-delete Games.
 */
export const courts = pgTable(
  "courts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .references(() => venues.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    venueNameUnique: uniqueIndex("courts_venue_id_name_unique").using(
      "btree",
      table.venueId,
      sql`lower(btrim(${table.name}))`,
    ),
  }),
);

export const courtRelations = relations(courts, ({ one }) => ({
  venue: one(venues, {
    fields: [courts.venueId],
    references: [venues.id],
  }),
}));
