import { bahrainDate } from "@repo/domain/bahrain-date.test-support";
import {
  LEVEL_BAND_SELECT_NONE,
  LEVEL_RANGE_INVERTED_MESSAGE,
  parseLevelBandSelectTenths,
} from "@repo/domain/level-range";
import { describe, expect, it } from "vitest";

import {
  bookingGameHeader,
  bookingGameRequest,
  bookingGameReviewRows,
  splitCourtCost,
} from "./booking-game-model";

const NOW = bahrainDate(2026, 9, 4, 12, 0, 0);
const booking = {
  id: "booking-1",
  startsAt: bahrainDate(2026, 9, 4, 19, 0, 0),
  endsAt: bahrainDate(2026, 9, 4, 20, 30, 0),
  priceFils: 18_000,
  venue: { name: "Karbabad Courts" },
  court: { name: "Court 2" },
};
const open = {
  pricePerPlayer: "",
  levelMin: LEVEL_BAND_SELECT_NONE,
  levelMax: LEVEL_BAND_SELECT_NONE,
} as const;

describe("bookingGameHeader", () => {
  it("locks where and when to the Booking", () => {
    expect(bookingGameHeader(booking, NOW)).toEqual({
      title: ["New game"],
      subtitle:
        "Where and when come from the booking. Only the rest is yours to set.",
      context: {
        icon: "lock",
        parts: ["Tonight 7:00 PM", "Karbabad Courts", "Court 2"],
      },
    });
  });
});

describe("bookingGameReviewRows", () => {
  it("says the Game is private and Unrated", () => {
    expect(bookingGameReviewRows(booking)).toEqual([
      { label: "Court", value: "Karbabad Courts, Court 2" },
      { label: "Time", value: "7:00 PM to 8:30 PM" },
      { label: "Seats", value: "4 open seats" },
      { label: "Who can join", value: "People you invite" },
      { label: "Rating", value: "Unrated" },
    ]);
  });
});

describe("splitCourtCost", () => {
  it("shares the court price across four seats, rounding up to the fils", () => {
    expect(splitCourtCost(18_000)).toBe("4.500");
    expect(splitCourtCost(10_001)).toBe("2.501");
  });
});

describe("bookingGameRequest", () => {
  it("sends only the Booking when nothing is set", () => {
    expect(bookingGameRequest("booking-1", open)).toEqual({
      ok: true,
      input: { bookingId: "booking-1" },
    });
  });

  it("sends the price in fils and the Level bounds in tenths", () => {
    expect(
      bookingGameRequest("booking-1", {
        pricePerPlayer: "4.500",
        levelMin: "C",
        levelMax: "B",
      }),
    ).toEqual({
      ok: true,
      input: {
        bookingId: "booking-1",
        pricePerPlayerFils: 4_500,
        levelMinTenths: parseLevelBandSelectTenths("C", "min"),
        levelMaxTenths: parseLevelBandSelectTenths("B", "max"),
      },
    });
  });

  it("refuses a bad price and an inverted range", () => {
    const badPrice = bookingGameRequest("booking-1", {
      ...open,
      pricePerPlayer: "abc",
    });
    expect(badPrice.ok).toBe(false);
    expect(!badPrice.ok && badPrice.errors.pricePerPlayerFils).toBeTruthy();
    expect(
      bookingGameRequest("booking-1", {
        ...open,
        levelMin: "B",
        levelMax: "C",
      }),
    ).toEqual({
      ok: false,
      errors: { levelMinTenths: LEVEL_RANGE_INVERTED_MESSAGE },
    });
  });
});
