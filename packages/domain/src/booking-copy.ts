import type { RefundStep } from "./booking-refund";
import { PRODUCT_TIMEZONE } from "./product-timezone";
import type { SlotRefusal } from "./booking-slots";

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "no_show"
  | "expired";

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  no_show: "No-show",
  expired: "Expired",
};

export function bookingStatusLabel(status: BookingStatus): string {
  return STATUS_LABELS[status];
}

export const SLOT_REFUSAL_MESSAGES: Record<SlotRefusal, string> = {
  bad_duration: "That duration is not offered at this Venue",
  off_grid: "That start time is not on this Venue's booking grid",
  too_soon: "That time is too soon to book",
  too_far: "That day is too far ahead to book",
  ended: "That time has already passed",
  outside_hours: "The Venue is not open at that time",
  closure: "That time is unavailable",
  no_price: "That time cannot be booked",
  taken: "That slot was just taken",
};

export function cancelWindowClosedMessage(venuePhone: string | null): string {
  const base = "This Booking can no longer be cancelled in the app";
  return venuePhone
    ? `${base}. Call the Venue on ${venuePhone}`
    : `${base}. Contact the Venue`;
}

const stepFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: PRODUCT_TIMEZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function refundWords(percent: number) {
  if (percent >= 100) {
    return "Full refund";
  }
  if (percent <= 0) {
    return "No refund";
  }
  return `${percent}% refund`;
}

/** "Full refund until Tue 18:00, then 50% refund", or null when nothing changes. */
export function describeNextRefundStep(step: RefundStep | null): string | null {
  if (!step) {
    return null;
  }
  const when = stepFormatter.format(step.deadline).replace(",", "");
  return `${refundWords(step.currentPercent)} until ${when}, then ${refundWords(step.nextPercent).toLowerCase()}`;
}
