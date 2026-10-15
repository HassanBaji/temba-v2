import { pgEnum } from "drizzle-orm/pg-core";

export const bookingStatus = pgEnum("booking_status", [
  "pending_payment",
  "confirmed",
  "cancelled",
  "no_show",
  "expired",
]);

export const bookingSource = pgEnum("booking_source", ["app", "venue"]);

export const bookingPaymentStatus = pgEnum("booking_payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
  "waived",
]);

export const bookingCancelledBy = pgEnum("booking_cancelled_by", [
  "customer",
  "venue",
]);

export const paymentProvider = pgEnum("payment_provider", ["manual", "tap"]);

export const paymentMethod = pgEnum("payment_method", [
  "cash",
  "card",
  "benefit",
  "transfer",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
  "waived",
]);
