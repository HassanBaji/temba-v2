import type { PaymentStatus } from "@repo/domain/booking-payment";
import type { BookingStatus } from "@repo/domain/booking-copy";
import { formatGameClock, formatWeekday } from "@repo/domain/format-game-start";
import { zonedParts } from "@repo/domain/product-timezone";

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

export function dayBlock(startsAt: Date): { day: string; weekday: string } {
  return {
    day: String(zonedParts(startsAt).day),
    weekday: formatWeekday(startsAt, "short"),
  };
}

export function rowTitle(row: BookingRow): string {
  return `${formatGameClock(row.startsAt)}, ${row.venue.name}`;
}

export function rowDetail(row: BookingRow): string {
  return `${row.court.name}, ${minutesBetween(row.startsAt, row.endsAt)} min`;
}

export function rowBadge(row: BookingRow, now: Date): string {
  switch (row.status) {
    case "pending_payment":
      return "Finish payment";
    case "cancelled":
      return "Cancelled";
    case "no_show":
      return "No-show";
    case "expired":
      return "Expired";
    case "confirmed":
      if (row.endsAt.getTime() <= now.getTime()) {
        return "Played";
      }
      return row.paymentStatus === "paid" ? "Paid" : "Pay at venue";
  }
}

export function tabLabel(
  label: string,
  count: number | null,
  hasMore: boolean,
): string {
  if (count === null || count === 0) {
    return label;
  }
  return `${label}, ${hasMore ? `${count}+` : count}`;
}

export function bookingsEmptyCopy(tab: BookingsTab): {
  title: string;
  description: string;
} {
  return tab === "upcoming"
    ? {
        title: "No upcoming bookings",
        description: "Book a court and it will show here.",
      }
    : {
        title: "No past bookings",
        description: "Bookings you have played or cancelled show here.",
      };
}

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 1440;

/** "in 2 h 15 min" or "in 40 min" under a day out, "on now" once started. */
export function startsInLabel(
  startsAt: Date,
  endsAt: Date,
  now: Date,
): string | null {
  if (startsAt.getTime() <= now.getTime()) {
    return endsAt.getTime() > now.getTime() ? "on now" : null;
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
    return `in ${minutes} min`;
  }
  return minutes === 0 ? `in ${hours} h` : `in ${hours} h ${minutes} min`;
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

/** "1 booking", "3 bookings", "20+ bookings". */
export function countLabel(
  count: number,
  noun: { one: string; other: string },
  hasMore = false,
): string {
  return `${count}${hasMore ? "+" : ""} ${count === 1 && !hasMore ? noun.one : noun.other}`;
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
