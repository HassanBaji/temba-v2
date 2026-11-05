import { latinDigits } from "@repo/i18n/digits";
import { intlLocale, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RefundStep } from "./booking-refund";
import { formatGameClock } from "./format-game-start";
import { PRODUCT_TIMEZONE } from "./product-timezone";
import type { SlotRefusal } from "./booking-slots";

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "no_show"
  | "expired";

const STATUS_KEYS = {
  pending_payment: "pendingPayment",
  confirmed: "confirmed",
  cancelled: "cancelled",
  no_show: "noShow",
  expired: "expired",
} as const satisfies Record<BookingStatus, string>;

export function bookingStatusLabel(
  status: BookingStatus,
  locale: Locale,
): string {
  return messagesFor(locale).booking.status[STATUS_KEYS[status]];
}

const SLOT_REFUSAL_KEYS = {
  bad_duration: "badDuration",
  off_grid: "offGrid",
  too_soon: "tooSoon",
  too_far: "tooFar",
  ended: "ended",
  outside_hours: "outsideHours",
  closure: "closure",
  no_price: "noPrice",
  taken: "taken",
} as const satisfies Record<SlotRefusal, string>;

export function slotRefusalMessage(
  reason: SlotRefusal,
  locale: Locale,
): string {
  return messagesFor(locale).booking.slotRefusal[SLOT_REFUSAL_KEYS[reason]];
}

export function cancelWindowClosedMessage(
  venuePhone: string | null,
  locale: Locale,
): string {
  const m = messagesFor(locale).booking;
  return venuePhone
    ? m.cancelWindowClosedCall(venuePhone)
    : m.cancelWindowClosedContact;
}

const stepFormatters = new Map<Locale, Intl.DateTimeFormat>();

function stepFormatter(locale: Locale) {
  let formatter = stepFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(intlLocale(locale), {
      timeZone: PRODUCT_TIMEZONE,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      numberingSystem: "latn",
    });
    stepFormatters.set(locale, formatter);
  }
  return formatter;
}

function refundWords(percent: number, locale: Locale) {
  const m = messagesFor(locale).booking.refund;
  if (percent >= 100) {
    return m.full;
  }
  if (percent <= 0) {
    return m.none;
  }
  return m.percent(percent);
}

/** "Full refund until Tue 18:00, then 50% refund", or null when nothing changes. */
export function describeNextRefundStep(
  step: RefundStep | null,
  locale: Locale,
): string | null {
  if (!step) {
    return null;
  }
  const when = latinDigits(
    stepFormatter(locale).format(step.deadline).replace(",", ""),
  );
  return messagesFor(locale).booking.nextRefundStep(
    refundWords(step.currentPercent, locale),
    when,
    refundWords(step.nextPercent, locale),
  );
}

/** The line Game details shows for a Booking Game: "Court 2, 7:00 PM to 8:30 PM". */
export function bookedCourtLine(
  booking: {
    courtName: string;
    startsAt: Date;
    endsAt: Date;
  },
  locale: Locale,
): string {
  return messagesFor(locale).booking.bookedCourtLine(
    booking.courtName,
    formatGameClock(booking.startsAt, locale),
    formatGameClock(booking.endsAt, locale),
  );
}
