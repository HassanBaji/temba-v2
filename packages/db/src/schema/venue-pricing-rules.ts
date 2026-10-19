import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { courts } from "./courts";
import { venues } from "./venues";

export const venuePricingRules = pgTable(
  "venue_pricing_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .references(() => venues.id, { onDelete: "cascade" })
      .notNull(),
    courtId: uuid("court_id").references(() => courts.id, {
      onDelete: "cascade",
    }),
    weekdays: smallint("weekdays").array().notNull(),
    startMinutes: integer("start_minutes").notNull(),
    endMinutes: integer("end_minutes").notNull(),
    hourlyRateFils: integer("hourly_rate_fils").notNull(),
    label: varchar("label", { length: 60 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    venueIdx: index("venue_pricing_rules_venue_id_idx").on(table.venueId),
    weekdaysCheck: check(
      "venue_pricing_rules_weekdays_check",
      sql`cardinality(${table.weekdays}) > 0 and ${table.weekdays} <@ array[0,1,2,3,4,5,6]::smallint[]`,
    ),
    windowCheck: check(
      "venue_pricing_rules_window_check",
      sql`${table.startMinutes} >= 0 and ${table.startMinutes} < ${table.endMinutes} and ${table.endMinutes} <= 1800`,
    ),
    rateCheck: check(
      "venue_pricing_rules_rate_check",
      sql`${table.hourlyRateFils} >= 0 and ${table.hourlyRateFils} <= 1000000000`,
    ),
  }),
);

export const venuePricingRulesRelations = relations(
  venuePricingRules,
  ({ one }) => ({
    venue: one(venues, {
      fields: [venuePricingRules.venueId],
      references: [venues.id],
    }),
    court: one(courts, {
      fields: [venuePricingRules.courtId],
      references: [courts.id],
    }),
  }),
);
