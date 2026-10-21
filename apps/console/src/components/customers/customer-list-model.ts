import { formatDayMonth, formatWeekday } from "@repo/domain/format-game-start";
import { productDaysBetween, zonedParts } from "@repo/domain/product-timezone";

export const CUSTOMER_SORTS = [
  "lastVisit",
  "bookings",
  "noShows",
  "owed",
  "name",
] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

export const SORT_OPTIONS: readonly { value: CustomerSort; label: string }[] = [
  { value: "lastVisit", label: "Last booking" },
  { value: "bookings", label: "Most Bookings" },
  { value: "noShows", label: "Most no-shows" },
  { value: "owed", label: "Most owed" },
  { value: "name", label: "Name" },
];

export function isCustomerSort(value: string): value is CustomerSort {
  return (CUSTOMER_SORTS as readonly string[]).includes(value);
}

type ListedCustomer =
  | { kind: "user"; username: string | null }
  | { kind: "guest"; phone: string | null };

/** The design's second line: Temba players by handle, Guests by the phone the Venue holds. */
export function customerSubtitle(customer: ListedCustomer): string {
  if (customer.kind === "guest") {
    return customer.phone ? `Phone only, ${customer.phone}` : "Phone only";
  }
  return customer.username ? `Temba, @${customer.username}` : "Temba";
}

/** "Today", "Yesterday", "Tomorrow", a weekday within the week, else "4 Oct" (with the year when it differs). */
export function lastBookingLabel(startsAt: Date, now: Date): string {
  const days = productDaysBetween(now, startsAt);
  if (days === 0) {
    return "Today";
  }
  if (days === -1) {
    return "Yesterday";
  }
  if (days === 1) {
    return "Tomorrow";
  }
  if (Math.abs(days) < 7) {
    return formatWeekday(startsAt, "short");
  }
  return formatDayMonth(startsAt, {
    year: zonedParts(startsAt).year !== zonedParts(now).year,
  });
}

export function customerCountLabel(total: number, searching: boolean): string {
  const noun = total === 1 ? "Customer" : "Customers";
  return searching ? `${total} matching` : `${total} ${noun}`;
}
