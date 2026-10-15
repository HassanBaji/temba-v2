import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { paymentMethod, paymentProvider, paymentStatus } from "./booking-enums";
import { bookings } from "./bookings";
import { user } from "./user";

export const bookingPayments = pgTable(
  "booking_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .references(() => bookings.id, { onDelete: "cascade" })
      .notNull(),
    provider: paymentProvider("provider").notNull(),
    method: paymentMethod("method"),
    status: paymentStatus("status").notNull().default("pending"),
    amountFils: integer("amount_fils").notNull(),
    providerReference: varchar("provider_reference", { length: 255 }),
    clientRedirectUrl: varchar("client_redirect_url", { length: 2048 }),
    providerStatus: varchar("provider_status", { length: 64 }),
    failureReason: varchar("failure_reason", { length: 500 }),
    settledByUserId: uuid("settled_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    settledAt: timestamp("settled_at"),
    refundedFils: integer("refunded_fils").notNull().default(0),
    refundReference: varchar("refund_reference", { length: 255 }),
    refundedByUserId: uuid("refunded_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    refundedAt: timestamp("refunded_at"),
    refundFailureReason: varchar("refund_failure_reason", { length: 500 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    bookingIdx: index("booking_payments_booking_id_idx").on(table.bookingId),
    providerReferenceIdx: uniqueIndex(
      "booking_payments_provider_reference_unique",
    )
      .on(table.provider, table.providerReference)
      .where(sql`${table.providerReference} is not null`),
    refundedCheck: check(
      "booking_payments_refunded_check",
      sql`${table.refundedFils} >= 0 and ${table.refundedFils} <= ${table.amountFils}`,
    ),
  }),
);

export const bookingPaymentsRelations = relations(
  bookingPayments,
  ({ one }) => ({
    booking: one(bookings, {
      fields: [bookingPayments.bookingId],
      references: [bookings.id],
    }),
  }),
);
