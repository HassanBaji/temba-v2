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
