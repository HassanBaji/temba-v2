import { describe, expect, it } from "vitest";

import {
  bookingsEmptyCopy,
  countLabel,
  dayBlock,
  nextBookingAction,
  priceParts,
  rowBadge,
  rowDetail,
  rowTitle,
  startsInLabel,
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

describe("startsInLabel", () => {
  const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

  it("counts down in hours and minutes under a day out", () => {
    expect(startsInLabel(at(135), at(195), NOW)).toBe("in 2 h 15 min");
    expect(startsInLabel(at(120), at(180), NOW)).toBe("in 2 h");
    expect(startsInLabel(at(40), at(100), NOW)).toBe("in 40 min");
    expect(startsInLabel(at(0.5), at(60), NOW)).toBe("in 1 min");
  });

  it("says on now while the booking runs, and nothing a day or more out", () => {
    expect(startsInLabel(at(-10), at(50), NOW)).toBe("on now");
    expect(startsInLabel(at(-70), at(-10), NOW)).toBeNull();
    expect(startsInLabel(at(1440), at(1500), NOW)).toBeNull();
  });
});

describe("priceParts", () => {
  it("splits the currency off the amount", () => {
    expect(priceParts("20.000 BD")).toEqual({
      amount: "20.000",
      currency: "BD",
    });
    expect(priceParts("Free")).toEqual({ amount: "Free", currency: "" });
  });
});

describe("countLabel", () => {
  const noun = { one: "booking", other: "bookings" };

  it("pluralises and marks a partial count", () => {
    expect(countLabel(1, noun)).toBe("1 booking");
    expect(countLabel(0, noun)).toBe("0 bookings");
    expect(countLabel(3, noun)).toBe("3 bookings");
    expect(countLabel(20, noun, true)).toBe("20+ bookings");
  });
});

describe("nextBookingAction", () => {
  it("finishes payment, opens the game, or makes one", () => {
    expect(nextBookingAction({ status: "pending_payment", gameId: null })).toBe(
      "finish_payment",
    );
    expect(nextBookingAction({ status: "confirmed", gameId: "g1" })).toBe(
      "open_game",
    );
    expect(nextBookingAction({ status: "confirmed", gameId: null })).toBe(
      "make_game",
    );
    expect(nextBookingAction({ status: "cancelled", gameId: null })).toBeNull();
  });
});
