import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { courts } from "./courts";
import { communities } from "./communities";
import { venueClosures } from "./venue-closures";
import { venueManagers } from "./venue-managers";
import { venueOpeningHours } from "./venue-opening-hours";

type VenueCancellationPolicy = {
  tiers: { hoursBefore: number; refundPercent: number }[];
  lateRefundPercent: number;
  customerCancelUntilMinutes: number;
};

/**
 * Venue is the evolved leftover courts table (same id space). Game.venueId,
 * coach, and coaching-session foreign keys stay on this row (ADR-0007).
 * Match.courtId points at Court, not Venue (ADR-0008).
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
    acceptingBookings: boolean("accepting_bookings").notNull().default(false),
    slotMinutes: integer("slot_minutes").notNull().default(30),
    durationOptionsMinutes: integer("duration_options_minutes")
      .array()
      .notNull()
      .default(sql`'{60,90}'::integer[]`),
    bookingHorizonDays: integer("booking_horizon_days").notNull().default(14),
    minLeadMinutes: integer("min_lead_minutes").notNull().default(60),
    description: varchar("description", { length: 1000 }),
    bookingNotes: varchar("booking_notes", { length: 1000 }),
    cancellationPolicy: jsonb("cancellation_policy")
      .$type<VenueCancellationPolicy>()
      .notNull()
      .default(
        sql`'{"tiers":[{"hoursBefore":24,"refundPercent":100}],"lateRefundPercent":0,"customerCancelUntilMinutes":0}'::jsonb`,
      ),
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
    slotMinutesCheck: check(
      "venues_slot_minutes_check",
      sql`${table.slotMinutes} in (30, 60)`,
    ),
    bookingHorizonDaysCheck: check(
      "venues_booking_horizon_days_check",
      sql`${table.bookingHorizonDays} between 1 and 90`,
    ),
    minLeadMinutesCheck: check(
      "venues_min_lead_minutes_check",
      sql`${table.minLeadMinutes} between 0 and 1440`,
    ),
  }),
);

export const venueRelations = relations(venues, ({ many }) => ({
  courts: many(courts),
  communities: many(communities),
  managers: many(venueManagers),
  openingHours: many(venueOpeningHours),
  closures: many(venueClosures),
}));
