import type { PaymentStatus } from "@repo/domain/booking-payment";
import {
  formatDayMonth,
  formatGameClock,
  formatGameClockWithoutMeridiem,
  formatWeekday,
} from "@repo/domain/format-game-start";
import {
  addProductDays,
  productDayKey,
  productDaysBetween,
  zonedDateTimeToInstant,
} from "@repo/domain/product-timezone";

const MS_PER_MINUTE = 60_000;

export const LIST_SCOPES = ["upcoming", "past", "cancelled"] as const;
export type ListScope = (typeof LIST_SCOPES)[number];

export const UPCOMING_DAYS = 7;
export const PAST_DAYS = 30;

export const SCOPE_OPTIONS: readonly { value: ListScope; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
];

export type ListStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "no_show"
  | "expired";

export function dayStart(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return zonedDateTimeToInstant({
    year: year ?? Number.NaN,
    month: month ?? Number.NaN,
    day: date ?? Number.NaN,
  });
}

export function addDays(day: string, days: number): string {
  return productDayKey(addProductDays(dayStart(day), days));
}

/**
 * The door lists by slot time, so each scope is a day range plus statuses:
 * Upcoming is what still occupies a Court over the next week, Past what ended
 * in the last month, Cancelled what was cancelled or expired in that month.
 */
export function scopeQuery(
  scope: ListScope,
  today: string,
): { from: string; to: string; status: ListStatus[] } {
  switch (scope) {
    case "upcoming":
      return {
        from: today,
        to: addDays(today, UPCOMING_DAYS - 1),
        status: ["confirmed", "pending_payment"],
      };
    case "past":
      return {
        from: addDays(today, -(PAST_DAYS - 1)),
        to: today,
        status: ["confirmed", "no_show"],
      };
    case "cancelled":
      return {
        from: addDays(today, -(PAST_DAYS - 1)),
        to: today,
        status: ["cancelled", "expired"],
      };
  }
}

/** The day range only brackets the slot; this keeps today's rows on the right side of now. */
export function inScope(
  booking: { endsAt: Date },
  scope: ListScope,
  now: Date,
): boolean {
  switch (scope) {
    case "upcoming":
      return booking.endsAt.getTime() > now.getTime();
    case "past":
      return booking.endsAt.getTime() <= now.getTime();
    case "cancelled":
      return true;
  }
}

function digitsOf(value: string) {
  return value.replace(/\D/g, "");
}

/** Holder name, guest phone or the start of the Booking id, as typed in the search box. */
export function matchesSearch(
  booking: {
    id: string;
    holder: { name: string; kind: "user" | "guest"; phone?: string };
  },
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    return true;
  }
  if (booking.holder.name.toLowerCase().includes(needle)) {
    return true;
  }
  if (booking.id.toLowerCase().startsWith(needle)) {
    return true;
  }
  const digits = digitsOf(needle);
  const phone = booking.holder.phone ?? "";
  return digits.length > 0 && digitsOf(phone).includes(digits);
}

/** "Today 6:00 PM", "Tomorrow 7:00 PM", "Fri 5:00 PM" within the week, else "Thu 15 Oct 7:00 PM". */
export function whenLabel(startsAt: Date, now: Date): string {
  const days = productDaysBetween(now, startsAt);
  const day =
    days === 0
      ? "Today"
      : days === 1
        ? "Tomorrow"
        : days === -1
          ? "Yesterday"
          : Math.abs(days) < 7
            ? formatWeekday(startsAt, "short")
            : formatDayMonth(startsAt, { weekday: "short" });
  return `${day} ${formatGameClock(startsAt)}`;
}

export function durationLabel(startsAt: Date, endsAt: Date): string {
  const minutes = Math.round(
    (endsAt.getTime() - startsAt.getTime()) / MS_PER_MINUTE,
  );
  return `${minutes} min`;
}

/** "7:00 to 8:30 PM", repeating the meridiem only when it changes. */
export function timeRangeLabel(startsAt: Date, endsAt: Date): string {
  const start = formatGameClock(startsAt);
  const end = formatGameClock(endsAt);
  const sameMeridiem = start.split(" ").at(-1) === end.split(" ").at(-1);
  return `${sameMeridiem ? formatGameClockWithoutMeridiem(startsAt) : start} to ${end}`;
}

/** "Court 2, Thu 15 Oct 7:00 to 8:30 PM". */
export function bookingTitle(booking: {
  court: { name: string };
  startsAt: Date;
  endsAt: Date;
}): string {
  return `${booking.court.name}, ${formatDayMonth(booking.startsAt, { weekday: "short" })} ${timeRangeLabel(booking.startsAt, booking.endsAt)}`;
}

export function sourceLabel(source: "app" | "venue"): string {
  return source === "venue" ? "Manual" : "App";
}

export type PaymentMark = "paid" | "open" | "failed";

const PAYMENT_WORDS: Record<
  PaymentStatus,
  { mark: PaymentMark; word: string }
> = {
  pending: { mark: "open", word: "Unpaid" },
  paid: { mark: "paid", word: "Paid" },
  failed: { mark: "failed", word: "Failed" },
  refunded: { mark: "paid", word: "Refunded" },
  partially_refunded: { mark: "paid", word: "Part refunded" },
  waived: { mark: "paid", word: "Waived" },
};

/** The inline mark and word the design uses in place of a badge. */
export function paymentWord(status: PaymentStatus): {
  mark: PaymentMark;
  word: string;
} {
  return PAYMENT_WORDS[status];
}

export function countLabel(scope: ListScope, count: number): string {
  const noun = count === 1 ? "booking" : "bookings";
  switch (scope) {
    case "upcoming":
      return `${count} ${noun}, next ${UPCOMING_DAYS} days`;
    case "past":
      return `${count} ${noun}, last ${PAST_DAYS} days`;
    case "cancelled":
      return `${count} cancelled or expired, last ${PAST_DAYS} days`;
  }
}
