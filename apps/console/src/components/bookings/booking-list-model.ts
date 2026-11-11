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
import type { Locale } from "@repo/i18n/locale";
import { messagesFor, type Messages } from "@repo/i18n/messages";

const MS_PER_MINUTE = 60_000;

export const LIST_SCOPES = ["upcoming", "past", "cancelled"] as const;
export type ListScope = (typeof LIST_SCOPES)[number];

export const UPCOMING_DAYS = 7;
export const PAST_DAYS = 30;

export function scopeOptions(
  locale: Locale,
): readonly { value: ListScope; label: string }[] {
  const words = messagesFor(locale).consoleBookings.scope;
  return LIST_SCOPES.map((value) => ({ value, label: words[value] }));
}

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
export function whenLabel(startsAt: Date, now: Date, locale: Locale): string {
  const m = messagesFor(locale).consoleBookings;
  const days = productDaysBetween(now, startsAt);
  const day =
    days === 0
      ? m.today
      : days === 1
        ? m.tomorrow
        : days === -1
          ? m.yesterday
          : Math.abs(days) < 7
            ? formatWeekday(startsAt, "short", locale)
            : formatDayMonth(startsAt, locale, { weekday: "short" });
  return m.dayAndTime(day, formatGameClock(startsAt, locale));
}

export function durationLabel(
  startsAt: Date,
  endsAt: Date,
  locale: Locale,
): string {
  const minutes = Math.round(
    (endsAt.getTime() - startsAt.getTime()) / MS_PER_MINUTE,
  );
  return messagesFor(locale).consoleBookings.minutes(minutes);
}

/** "7:00 to 8:30 PM", repeating the meridiem only when it changes. */
export function timeRangeLabel(
  startsAt: Date,
  endsAt: Date,
  locale: Locale,
): string {
  const start = formatGameClock(startsAt, locale);
  const end = formatGameClock(endsAt, locale);
  const sameMeridiem = start.split(" ").at(-1) === end.split(" ").at(-1);
  return messagesFor(locale).consoleBookings.timeRange(
    sameMeridiem ? formatGameClockWithoutMeridiem(startsAt, locale) : start,
    end,
  );
}

/** "Court 2, Thu 15 Oct 7:00 to 8:30 PM". */
export function bookingTitle(
  booking: {
    court: { name: string };
    startsAt: Date;
    endsAt: Date;
  },
  locale: Locale,
): string {
  return messagesFor(locale).consoleBookings.title(
    booking.court.name,
    formatDayMonth(booking.startsAt, locale, { weekday: "short" }),
    timeRangeLabel(booking.startsAt, booking.endsAt, locale),
  );
}

export function sourceLabel(source: "app" | "venue", locale: Locale): string {
  return messagesFor(locale).consoleBookings.source[source];
}

export type PaymentMark = "paid" | "open" | "failed";

const PAYMENT_WORDS: Record<
  PaymentStatus,
  {
    mark: PaymentMark;
    word: keyof Messages["consoleBookings"]["payment"];
  }
> = {
  pending: { mark: "open", word: "unpaid" },
  paid: { mark: "paid", word: "paid" },
  failed: { mark: "failed", word: "failed" },
  refunded: { mark: "paid", word: "refunded" },
  partially_refunded: { mark: "paid", word: "partiallyRefunded" },
  waived: { mark: "paid", word: "waived" },
};

/** The inline mark and word the design uses in place of a badge. */
export function paymentWord(
  status: PaymentStatus,
  locale: Locale,
): {
  mark: PaymentMark;
  word: string;
} {
  const { mark, word } = PAYMENT_WORDS[status];
  return { mark, word: messagesFor(locale).consoleBookings.payment[word] };
}

export function countLabel(
  scope: ListScope,
  count: number,
  locale: Locale,
): string {
  const words = messagesFor(locale).consoleBookings.count;
  switch (scope) {
    case "upcoming":
      return words.upcoming(count, UPCOMING_DAYS);
    case "past":
      return words.past(count, PAST_DAYS);
    case "cancelled":
      return words.cancelled(count, PAST_DAYS);
  }
}
