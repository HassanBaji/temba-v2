import { describe, expect, it } from "vitest";

import {
  bookingsEmptyCopy,
  dayBlock,
  rowBadge,
  rowDetail,
  rowTitle,
  tabLabel,
  type BookingRow,
} from "./my-bookings-model";

const NOW = new Date("2026-10-15T12:00:00Z");

function row(overrides: Partial<BookingRow> = {}): BookingRow {
  return {
    id: "b1",
    startsAt: new Date("2026-10-20T20:00:00+03:00"),
    endsAt: new Date("2026-10-20T22:00:00+03:00"),
    status: "confirmed",
    paymentStatus: "pending",
    venue: { name: "Karbabad Courts" },
    court: { name: "Court 1" },
    ...overrides,
  };
}

describe("row copy", () => {
  it("writes the date block, title and detail", () => {
    expect(dayBlock(row().startsAt)).toEqual({ day: "20", weekday: "Tue" });
    expect(rowTitle(row())).toBe("8:00 PM, Karbabad Courts");
    expect(rowDetail(row())).toBe("Court 1, 120 min");
  });
});

describe("rowBadge", () => {
  it("asks to finish a pending payment", () => {
    expect(rowBadge(row({ status: "pending_payment" }), NOW)).toBe(
      "Finish payment",
    );
  });

  it("reads upcoming payment state", () => {
    expect(rowBadge(row(), NOW)).toBe("Pay at venue");
    expect(rowBadge(row({ paymentStatus: "paid" }), NOW)).toBe("Paid");
  });

  it("reads past outcomes", () => {
    const past = {
      startsAt: new Date("2026-10-10T20:00:00+03:00"),
      endsAt: new Date("2026-10-10T21:00:00+03:00"),
    };
    expect(rowBadge(row(past), NOW)).toBe("Played");
    expect(rowBadge(row({ ...past, status: "cancelled" }), NOW)).toBe(
      "Cancelled",
    );
    expect(rowBadge(row({ ...past, status: "no_show" }), NOW)).toBe("No-show");
  });
});

describe("tabLabel", () => {
  it("adds the count once loaded", () => {
    expect(tabLabel("Upcoming", 3, false)).toBe("Upcoming, 3");
    expect(tabLabel("Upcoming", 20, true)).toBe("Upcoming, 20+");
    expect(tabLabel("Upcoming", 0, false)).toBe("Upcoming");
    expect(tabLabel("Past", null, false)).toBe("Past");
  });
});

describe("bookingsEmptyCopy", () => {
  it("differs per tab", () => {
    expect(bookingsEmptyCopy("upcoming").title).toBe("No upcoming bookings");
    expect(bookingsEmptyCopy("past").title).toBe("No past bookings");
  });
});
