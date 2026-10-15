import { describe, expect, it } from "vitest";

import {
  addDays,
  buildDayGrid,
  clampRange,
  closuresForCourt,
  refundDisplay,
  rowSpan,
  settleActions,
  weekDays,
  weekStart,
} from "./booking-model";
import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";

const at = (day: number, hour: number, minute = 0) =>
  zonedDateTimeToInstant({ year: 2030, month: 1, day, hour, minute });

describe("booking-model", () => {
  it("walks days and weeks Monday to Sunday", () => {
    expect(addDays("2030-01-31", 1)).toBe("2030-02-01");
    expect(weekStart("2030-01-06")).toBe("2029-12-31");
    expect(weekDays("2030-01-09")).toEqual([
      "2030-01-07",
      "2030-01-08",
      "2030-01-09",
      "2030-01-10",
      "2030-01-11",
      "2030-01-12",
      "2030-01-13",
    ]);
  });

  it("builds rows at the Venue's step across the Opening hours", () => {
    const grid = buildDayGrid({
      day: "2030-01-07",
      slotMinutes: 30,
      windows: [{ opensAtMinutes: 9 * 60, closesAtMinutes: 11 * 60 }],
      bookings: [],
    });
    expect(grid.rows.map((row) => row.minute)).toEqual([540, 570, 600, 630]);
    expect(grid.rows.every((row) => row.open)).toBe(true);
  });

  it("stretches to hold a Booking outside Opening hours and marks those rows closed", () => {
    const grid = buildDayGrid({
      day: "2030-01-07",
      slotMinutes: 60,
      windows: [{ opensAtMinutes: 9 * 60, closesAtMinutes: 11 * 60 }],
      bookings: [
        { id: "b", courtId: "c", startsAt: at(7, 7), endsAt: at(7, 8, 30) },
      ],
    });
    expect(grid.startMinute).toBe(7 * 60);
    expect(grid.endMinute).toBe(11 * 60);
    expect(grid.rows.map((row) => row.open)).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });

  it("clips a Booking that started the day before", () => {
    const grid = buildDayGrid({
      day: "2030-01-07",
      slotMinutes: 30,
      windows: [{ opensAtMinutes: 9 * 60, closesAtMinutes: 11 * 60 }],
      bookings: [
        { id: "b", courtId: "c", startsAt: at(6, 23), endsAt: at(7, 0, 30) },
      ],
    });
    expect(grid.startMinute).toBe(0);
    expect(rowSpan(grid, 30, { startMinute: -60, endMinute: 30 })).toEqual({
      top: 0,
      height: 1,
    });
  });

  it("places an interval by rows from the grid top", () => {
    const grid = { startMinute: 540, endMinute: 720 };
    expect(rowSpan(grid, 30, { startMinute: 600, endMinute: 690 })).toEqual({
      top: 2,
      height: 3,
    });
    expect(rowSpan(grid, 30, { startMinute: 720, endMinute: 780 })).toBeNull();
  });

  it("applies whole-Venue and Court Closures to the right Court and day", () => {
    const closures = [
      {
        id: "1",
        courtId: null,
        startsAt: at(7, 10),
        endsAt: at(7, 11),
        reason: null,
      },
      {
        id: "2",
        courtId: "a",
        startsAt: at(7, 12),
        endsAt: at(7, 13),
        reason: null,
      },
      {
        id: "3",
        courtId: "a",
        startsAt: at(8, 12),
        endsAt: at(8, 13),
        reason: null,
      },
    ];
    expect(
      closuresForCourt(closures, "a", "2030-01-07").map((c) => c.id),
    ).toEqual(["1", "2"]);
    expect(
      closuresForCourt(closures, "b", "2030-01-07").map((c) => c.id),
    ).toEqual(["1"]);
  });

  it("clamps a range to the door's limit", () => {
    expect(clampRange("2030-01-01", "2030-03-01", 31)).toBe("2030-01-31");
    expect(clampRange("2030-01-05", "2030-01-01", 31)).toBe("2030-01-05");
    expect(clampRange("2030-01-01", "2030-01-10", 31)).toBe("2030-01-10");
  });

  it("reads a refund as in progress until the Payment row changes", () => {
    const updatedAt = at(7, 12);
    expect(
      refundDisplay({ updatedAt, refundFailureReason: null }, updatedAt),
    ).toBe("in_progress");
    expect(
      refundDisplay(
        { updatedAt: at(7, 13), refundFailureReason: "Declined" },
        updatedAt,
      ),
    ).toBe("failed");
    expect(
      refundDisplay({ updatedAt, refundFailureReason: "Declined" }, null),
    ).toBe("failed");
    expect(refundDisplay({ updatedAt, refundFailureReason: null }, null)).toBe(
      "none",
    );
  });
});

describe("settleActions", () => {
  const row = (
    provider: "manual" | "tap",
    status: "pending" | "paid" | "failed",
    hour = 10,
  ) => ({ provider, status, createdAt: at(7, hour) });

  it("offers every outcome on a pending manual Payment or no Payment", () => {
    const all = { pay: true, waive: true, fail: true };
    expect(settleActions("confirmed", [])).toEqual(all);
    expect(settleActions("no_show", [row("manual", "pending")])).toEqual(all);
  });

  it("only waives a failed Tap Payment, and offers nothing once settled", () => {
    expect(settleActions("confirmed", [row("tap", "failed")])).toEqual({
      pay: false,
      waive: true,
      fail: false,
    });
    const none = { pay: false, waive: false, fail: false };
    expect(settleActions("confirmed", [row("manual", "paid")])).toEqual(none);
    expect(settleActions("confirmed", [row("tap", "pending")])).toEqual(none);
  });

  it("offers nothing on Bookings that are not awaiting settlement", () => {
    const none = { pay: false, waive: false, fail: false };
    for (const status of ["pending_payment", "expired", "cancelled"]) {
      expect(settleActions(status, [])).toEqual(none);
    }
  });

  it("reads the latest Payment", () => {
    expect(
      settleActions("confirmed", [
        row("tap", "failed", 9),
        row("manual", "paid", 11),
      ]),
    ).toEqual({ pay: false, waive: false, fail: false });
  });
});
