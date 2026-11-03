import type { PaymentStatus } from "@repo/domain/booking-payment";
import type { BookingStatus } from "@repo/domain/booking-copy";
import { formatGameClock, formatWeekday } from "@repo/domain/format-game-start";
import { zonedParts } from "@repo/domain/product-timezone";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { minutesBetween } from "./booking-model";

export type BookingsTab = "upcoming" | "past";

export type BookingRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  venue: { name: string };
  court: { name: string };
};

export function dayBlock(
  startsAt: Date,
  locale: Locale,
): { day: string; weekday: string } {
  return {
    day: String(zonedParts(startsAt).day),
    weekday: formatWeekday(startsAt, "short", locale),
  };
}

export function rowTitle(row: BookingRow, locale: Locale): string {
  return messagesFor(locale).mobileBooking.rowTitle(
    formatGameClock(row.startsAt, locale),
    row.venue.name,
  );
}

export function rowDetail(row: BookingRow, locale: Locale): string {
  return messagesFor(locale).mobileBooking.courtMinutes(
    row.court.name,
    minutesBetween(row.startsAt, row.endsAt),
  );
}

export function rowBadge(row: BookingRow, now: Date, locale: Locale): string {
  const m = messagesFor(locale);
  switch (row.status) {
    case "pending_payment":
      return m.mobileBooking.finishPayment;
    case "cancelled":
      return m.booking.status.cancelled;
    case "no_show":
      return m.booking.status.noShow;
    case "expired":
      return m.booking.status.expired;
    case "confirmed":
      if (row.endsAt.getTime() <= now.getTime()) {
        return m.mobileBooking.badgePlayed;
      }
      return row.paymentStatus === "paid"
        ? m.booking.paymentStatus.paid
        : m.mobileBooking.payAtVenueShort;
  }
}

export function tabLabel(
  label: string,
  count: number | null,
  hasMore: boolean,
  locale: Locale,
): string {
  if (count === null || count === 0) {
    return label;
  }
  const m = messagesFor(locale).mobileBooking;
  return m.tabWithCount(label, hasMore ? m.partialCount(count) : String(count));
}

export function bookingsEmptyCopy(
  tab: BookingsTab,
  locale: Locale,
): {
  title: string;
  description: string;
} {
  const m = messagesFor(locale).mobileBooking.bookingsEmpty;
  return tab === "upcoming" ? m.upcoming : m.past;
}

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 1440;

/** "in 2 h 15 min" or "in 40 min" under a day out, "on now" once started. */
export function startsInLabel(
  startsAt: Date,
  endsAt: Date,
  now: Date,
  locale: Locale,
): string | null {
  const m = messagesFor(locale).mobileBooking.startsIn;
  if (startsAt.getTime() <= now.getTime()) {
    return endsAt.getTime() > now.getTime() ? m.onNow : null;
  }
  const total = Math.max(
    1,
    Math.floor((startsAt.getTime() - now.getTime()) / MS_PER_MINUTE),
  );
  if (total >= MINUTES_PER_DAY) {
    return null;
  }
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) {
    return m.minutes(minutes);
  }
  return minutes === 0 ? m.hours(hours) : m.hoursMinutes(hours, minutes);
}

/** "20.000 BD" as its amount and currency, so the currency can sit muted. */
export function priceParts(formatted: string): {
  amount: string;
  currency: string;
} {
  const split = formatted.lastIndexOf(" ");
  return split < 0
    ? { amount: formatted, currency: "" }
    : {
        amount: formatted.slice(0, split),
        currency: formatted.slice(split + 1),
      };
}

export type CountNoun = {
  exact: (n: number) => string;
  orMore: (n: number) => string;
};

/** "1 booking", "3 bookings", "20+ bookings". */
export function countLabel(
  count: number,
  noun: CountNoun,
  hasMore = false,
): string {
  return hasMore ? noun.orMore(count) : noun.exact(count);
}

export type NextBookingAction = "finish_payment" | "open_game" | "make_game";

export function nextBookingAction(row: {
  status: BookingStatus;
  gameId: string | null;
}): NextBookingAction | null {
  if (row.status === "pending_payment") {
    return "finish_payment";
  }
  if (row.status !== "confirmed") {
    return null;
  }
  return row.gameId ? "open_game" : "make_game";
}
