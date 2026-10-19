import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  bookingCancelledBy,
  bookingPaymentStatus,
  bookingSource,
  bookingStatus,
} from "./booking-enums";
import { courts } from "./courts";
import { games } from "./games";
import { user } from "./user";
import { venues } from "./venues";

type BookingCancellationPolicy = {
  tiers: { hoursBefore: number; refundPercent: number }[];
  lateRefundPercent: number;
  customerCancelUntilMinutes: number;
};

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .references(() => venues.id, { onDelete: "restrict" })
      .notNull(),
    courtId: uuid("court_id")
      .references(() => courts.id, { onDelete: "restrict" })
      .notNull(),
    userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
    guestName: varchar("guest_name", { length: 255 }),
    guestPhone: varchar("guest_phone", { length: 32 }),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    status: bookingStatus("status").notNull().default("confirmed"),
    holdExpiresAt: timestamp("hold_expires_at"),
    source: bookingSource("source").notNull(),
    priceFils: integer("price_fils").notNull(),
    cancellationPolicy: jsonb("cancellation_policy")
      .$type<BookingCancellationPolicy>()
      .notNull(),
    paymentStatus: bookingPaymentStatus("payment_status")
      .notNull()
      .default("pending"),
    refundDueFils: integer("refund_due_fils"),
    cancellationChargeFils: integer("cancellation_charge_fils"),
    cancelledAt: timestamp("cancelled_at"),
    cancelledByUserId: uuid("cancelled_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    cancelledBy: bookingCancelledBy("cancelled_by"),
    cancelReason: varchar("cancel_reason", { length: 500 }),
    noShowAt: timestamp("no_show_at"),
    gameId: uuid("game_id")
      .references(() => games.id, { onDelete: "set null" })
      .unique(),
    managerNotes: varchar("manager_notes", { length: 1000 }),
    createdByUserId: uuid("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    courtStartsIdx: index("bookings_court_id_starts_at_idx").on(
      table.courtId,
      table.startsAt,
    ),
    venueStartsIdx: index("bookings_venue_id_starts_at_idx").on(
      table.venueId,
      table.startsAt,
    ),
    userStartsIdx: index("bookings_user_id_starts_at_idx")
      .on(table.userId, table.startsAt)
      .where(sql`${table.userId} is not null`),
    venueStatusIdx: index("bookings_venue_id_status_idx").on(
      table.venueId,
      table.status,
    ),
    holdIdx: index("bookings_status_hold_expires_at_idx")
      .on(table.status, table.holdExpiresAt)
      .where(sql`${table.status} = 'pending_payment'`),
    rangeCheck: check(
      "bookings_range_check",
      sql`${table.startsAt} < ${table.endsAt}`,
    ),
    holderCheck: check(
      "bookings_holder_check",
      sql`(${table.userId} is not null) <> (${table.guestName} is not null and ${table.guestPhone} is not null)`,
    ),
    gameHolderCheck: check(
      "bookings_game_holder_check",
      sql`${table.gameId} is null or ${table.userId} is not null`,
    ),
    holdCheck: check(
      "bookings_hold_check",
      sql`(${table.status} = 'pending_payment') = (${table.holdExpiresAt} is not null)`,
    ),
  }),
);

export const bookingsRelations = relations(bookings, ({ one }) => ({
  venue: one(venues, { fields: [bookings.venueId], references: [venues.id] }),
  court: one(courts, { fields: [bookings.courtId], references: [courts.id] }),
  user: one(user, { fields: [bookings.userId], references: [user.id] }),
  game: one(games, { fields: [bookings.gameId], references: [games.id] }),
}));
