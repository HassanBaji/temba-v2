import { relations, sql } from "drizzle-orm";
import {
  decimal,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { courts } from "./courts";
import { communities } from "./communities";

/**
 * Venue is the evolved leftover courts table (same id space). Game, coach,
 * and coaching-session foreign keys stay on this row (ADR-0007).
 */
export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    city: varchar("city", { length: 255 }).notNull(),
    country: varchar("country", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 255 }),
    website: varchar("website", { length: 255 }),
    logoImageUrl: varchar("logo_image_url", { length: 255 }),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    nameCityCountryUnique: uniqueIndex("venues_name_city_country_unique").using(
      "btree",
      sql`lower(btrim(${table.name}))`,
      sql`lower(btrim(${table.city}))`,
      sql`lower(btrim(${table.country}))`,
    ),
  }),
);

export const venueRelations = relations(venues, ({ many }) => ({
  courts: many(courts),
  communities: many(communities),
}));
