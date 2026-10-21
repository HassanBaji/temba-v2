import { describe, expect, it } from "vitest";

import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";

import {
  draftToInput,
  guestFromQuery,
  quotedPriceFils,
  startOptions,
  type NewBookingDraft,
} from "./new-booking-model";

const VENUE = "venue-1";
const COURT = "court-1";
// 2030-01-07 is a Monday (weekday 1).
const DAY = "2030-01-07";

const rules = [
  {
    courtId: null,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    startMinutes: 0,
    endMinutes: 18 * 60,
    hourlyRateFils: 10_000,
  },
  {
    courtId: null,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    startMinutes: 18 * 60,
    endMinutes: 22 * 60,
    hourlyRateFils: 12_000,
  },
];

function draft(patch: Partial<NewBookingDraft> = {}): NewBookingDraft {
  return {
    holder: { kind: "guest", name: "Hassan", phone: "+973 3612 4408" },
    courtId: COURT,
    day: DAY,
    startMinute: 17 * 60,
    durationMinutes: 90,
    priceInput: null,
    payment: "later",
    method: "cash",
    reference: "",
    notes: "",
    ...patch,
  };
}

describe("startOptions", () => {
  it("lists grid starts of the day's windows that leave a step before closing", () => {
    expect(
      startOptions({
        day: DAY,
        slotMinutes: 60,
        openingHours: [
          { weekday: 1, opensAtMinutes: 8 * 60, closesAtMinutes: 11 * 60 },
          { weekday: 1, opensAtMinutes: 20 * 60, closesAtMinutes: 25 * 60 },
          { weekday: 2, opensAtMinutes: 6 * 60, closesAtMinutes: 7 * 60 },
        ],
      }),
    ).toEqual([480, 540, 600, 1200, 1260, 1320, 1380, 1440]);
  });

  it("is empty on a closed day", () => {
    expect(
      startOptions({ day: DAY, slotMinutes: 30, openingHours: [] }),
    ).toEqual([]);
  });
});

describe("quotedPriceFils", () => {
  it("prices across a rate change", () => {
    expect(quotedPriceFils(rules, draft())).toBe(10_000 + 6_000);
  });

  it("is null when a minute is not covered or no start is picked", () => {
    expect(quotedPriceFils(rules, draft({ startMinute: 21 * 60 }))).toBeNull();
    expect(quotedPriceFils(rules, draft({ startMinute: null }))).toBeNull();
  });
});

describe("draftToInput", () => {
  it("books a Guest at the rules' price with payment left for later", () => {
    expect(draftToInput(VENUE, draft(), 16_000)).toEqual({
      ok: true,
      input: {
        venueId: VENUE,
        courtId: COURT,
        startsAt: zonedDateTimeToInstant({
          year: 2030,
          month: 1,
          day: 7,
          hour: 17,
        }),
        durationMinutes: 90,
        holder: { guestName: "Hassan", guestPhone: "+973 3612 4408" },
      },
    });
  });

  it("books a User, paid by card with a reference, and keeps notes", () => {
    const result = draftToInput(
      VENUE,
      draft({
        holder: { kind: "user", userId: "user-1", name: "Sara", detail: null },
        payment: "paid",
        method: "card",
        reference: " receipt 7 ",
        notes: " Brings own balls ",
      }),
      16_000,
    );
    expect(result).toMatchObject({
      ok: true,
      input: {
        holder: { userId: "user-1" },
        payment: { status: "paid", method: "card", reference: "receipt 7" },
        managerNotes: "Brings own balls",
      },
    });
  });

  it("waives without a method", () => {
    const result = draftToInput(VENUE, draft({ payment: "waived" }), 16_000);
    expect(result.ok && result.input.payment).toEqual({ status: "waived" });
  });

  it("sends a typed price only when it differs from the quote", () => {
    const same = draftToInput(VENUE, draft({ priceInput: "16.000" }), 16_000);
    expect(same.ok && "priceFils" in same.input).toBe(false);
    const typed = draftToInput(VENUE, draft({ priceInput: "12" }), 16_000);
    expect(typed.ok && typed.input.priceFils).toBe(12_000);
    const unpriced = draftToInput(VENUE, draft({ priceInput: "9.500" }), null);
    expect(unpriced.ok && unpriced.input.priceFils).toBe(9_500);
  });

  it.each([
    [draft({ holder: { kind: "none" } }), "Pick a Customer or add a new one"],
    [
      draft({ holder: { kind: "guest", name: "Hassan", phone: " " } }),
      "A new Customer needs a name and a phone",
    ],
    [draft({ startMinute: null }), "Pick a start time"],
    [draft({ priceInput: "abc" }), "Enter the price in BD, like 18.000"],
  ])("refuses an incomplete draft", (value, message) => {
    expect(draftToInput(VENUE, value, 16_000)).toEqual({ ok: false, message });
  });

  it("asks for a price when no rate covers the time", () => {
    expect(draftToInput(VENUE, draft(), null)).toEqual({
      ok: false,
      message: "No rate covers this time. Type a price",
    });
  });
});

describe("guestFromQuery", () => {
  it("takes digits as the phone and anything else as the name", () => {
    expect(guestFromQuery("+973 3612 4408")).toEqual({
      name: "",
      phone: "+973 3612 4408",
    });
    expect(guestFromQuery(" Khalid ")).toEqual({ name: "Khalid", phone: "" });
  });
});
