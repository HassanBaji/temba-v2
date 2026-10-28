import { describe, expect, it } from "vitest";

import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";

import {
  editDraftFrom,
  editToInput,
  shownPriceInput,
  type EditableBooking,
} from "./booking-edit-model";

const at = (day: number, hour: number, minute = 0) =>
  zonedDateTimeToInstant({ year: 2030, month: 1, day, hour, minute });

const unpaid: EditableBooking = {
  courtId: "court-1",
  startsAt: at(7, 18),
  endsAt: at(7, 19, 30),
  priceFils: 15_000,
  paymentStatus: "pending",
  managerNotes: null,
};
const paid = { ...unpaid, paymentStatus: "paid" };

describe("editDraftFrom", () => {
  it("reads the day, start minute and duration in the product timezone", () => {
    expect(editDraftFrom({ ...unpaid, managerNotes: "Regular" })).toEqual({
      courtId: "court-1",
      day: "2030-01-07",
      startMinute: 18 * 60,
      durationMinutes: 90,
      priceInput: null,
      notes: "Regular",
    });
  });
});

describe("editToInput", () => {
  it("sends nothing when nothing changed", () => {
    expect(editToInput("b", unpaid, editDraftFrom(unpaid), 15_000)).toEqual({
      ok: true,
      input: null,
    });
  });

  it("sends a move and lets the API reprice it", () => {
    const draft = {
      ...editDraftFrom(unpaid),
      courtId: "court-2",
      startMinute: 20 * 60,
    };
    expect(editToInput("b", unpaid, draft, 18_000)).toEqual({
      ok: true,
      input: {
        bookingId: "b",
        courtId: "court-2",
        startsAt: at(7, 20),
        durationMinutes: 90,
      },
    });
  });

  it("keeps a paid Booking's price when it moves", () => {
    const draft = { ...editDraftFrom(paid), durationMinutes: 120 };
    const result = editToInput("b", paid, draft, 20_000);
    expect(result.ok && result.input?.priceFils).toBe(15_000);
  });

  it("sends a typed price only when it differs", () => {
    const same = { ...editDraftFrom(unpaid), priceInput: "15.000" };
    expect(editToInput("b", unpaid, same, 15_000)).toEqual({
      ok: true,
      input: null,
    });
    const typed = { ...editDraftFrom(unpaid), priceInput: "12" };
    expect(editToInput("b", unpaid, typed, 15_000)).toEqual({
      ok: true,
      input: { bookingId: "b", priceFils: 12_000 },
    });
  });

  it("sets and clears notes", () => {
    const set = { ...editDraftFrom(unpaid), notes: " Pays monthly " };
    expect(editToInput("b", unpaid, set, 15_000)).toEqual({
      ok: true,
      input: { bookingId: "b", managerNotes: "Pays monthly" },
    });
    const withNotes = { ...unpaid, managerNotes: "Old" };
    const cleared = { ...editDraftFrom(withNotes), notes: "" };
    expect(editToInput("b", withNotes, cleared, 15_000)).toEqual({
      ok: true,
      input: { bookingId: "b", managerNotes: null },
    });
  });

  it("asks for a price when a move lands on unpriced time", () => {
    const draft = { ...editDraftFrom(unpaid), startMinute: 22 * 60 };
    expect(editToInput("b", unpaid, draft, null)).toEqual({
      ok: false,
      message: "No rate covers this time. Type a price",
    });
  });
});

describe("shownPriceInput", () => {
  it("shows the rate for a move, the current price otherwise, and a paid price always", () => {
    const moved = { ...editDraftFrom(unpaid), startMinute: 20 * 60 };
    expect(shownPriceInput(unpaid, moved, 18_000)).toBe("18.000");
    expect(shownPriceInput(unpaid, editDraftFrom(unpaid), 18_000)).toBe(
      "15.000",
    );
    expect(
      shownPriceInput(
        paid,
        { ...editDraftFrom(paid), startMinute: 20 * 60 },
        18_000,
      ),
    ).toBe("15.000");
  });
});
