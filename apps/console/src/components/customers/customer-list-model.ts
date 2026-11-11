import { formatDayMonth, formatWeekday } from "@repo/domain/format-game-start";
import { productDaysBetween, zonedParts } from "@repo/domain/product-timezone";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export const CUSTOMER_SORTS = [
  "lastVisit",
  "bookings",
  "noShows",
  "owed",
  "name",
] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

export function sortOptions(
  locale: Locale,
): readonly { value: CustomerSort; label: string }[] {
  const sorts = messagesFor(locale).consoleVenue.customers.sorts;
  return CUSTOMER_SORTS.map((value) => ({ value, label: sorts[value] }));
}

export function isCustomerSort(value: string): value is CustomerSort {
  return (CUSTOMER_SORTS as readonly string[]).includes(value);
}

type ListedCustomer =
  | { kind: "user"; username: string | null }
  | { kind: "guest"; phone: string | null };

/** The design's second line: Temba players by handle, Guests by the phone the Venue holds. */
export function customerSubtitle(
  customer: ListedCustomer,
  locale: Locale,
): string {
  const m = messagesFor(locale).consoleVenue.customers;
  if (customer.kind === "guest") {
    return customer.phone ? m.phoneOnlyWith(customer.phone) : m.phoneOnly;
  }
  return customer.username ? m.tembaWith(`@${customer.username}`) : m.temba;
}

/** "Today", "Yesterday", "Tomorrow", a weekday within the week, else "4 Oct" (with the year when it differs). */
export function lastBookingLabel(
  startsAt: Date,
  now: Date,
  locale: Locale,
): string {
  const m = messagesFor(locale).consoleVenue.customers;
  const days = productDaysBetween(now, startsAt);
  if (days === 0) {
    return m.today;
  }
  if (days === -1) {
    return m.yesterday;
  }
  if (days === 1) {
    return m.tomorrow;
  }
  if (Math.abs(days) < 7) {
    return formatWeekday(startsAt, "short", locale);
  }
  return formatDayMonth(startsAt, locale, {
    year: zonedParts(startsAt).year !== zonedParts(now).year,
  });
}

export function customerCountLabel(
  total: number,
  searching: boolean,
  locale: Locale,
): string {
  const m = messagesFor(locale).consoleVenue.customers;
  return searching ? m.matching(total) : m.count(total);
}
