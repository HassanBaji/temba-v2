import { describe, expect, it } from "vitest";

import {
  addDays,
  blockDetailLine,
  blockTone,
  buildDayGrid,
  clampRange,
  clippedOpenMinutes,
  closureTimeLabel,
  closuresForCourt,
  formatAxisClock,
  hourMarks,
  nowOffset,
  refundDisplay,
  rowSpan,
  scheduleStats,
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

describe("time axis", () => {
  it("formats the axis clock on a 12-hour dial", () => {
    expect(formatAxisClock(14 * 60, "meridiem")).toBe("2:00 PM");
    expect(formatAxisClock(0, "meridiem")).toBe("12:00 AM");
    expect(formatAxisClock(12 * 60 + 30, "meridiem")).toBe("12:30 PM");
    expect(formatAxisClock(25 * 60, "meridiem")).toBe("1:00 AM");
    expect(formatAxisClock(15 * 60)).toBe("3:00");
  });

  it("marks whole hours, with the meridiem on the first and at noon", () => {
    expect(
      hourMarks({ startMinute: 10 * 60 + 30, endMinute: 14 * 60 }),
    ).toEqual([
      { minute: 660, label: "11:00 AM" },
      { minute: 720, label: "12:00 PM" },
      { minute: 780, label: "1:00" },
    ]);
  });

  it("places now inside the grid and hides it outside", () => {
    const grid = { startMinute: 9 * 60, endMinute: 22 * 60 };
    expect(nowOffset(grid, "2030-01-07", at(7, 16, 28))).toBe(7 * 60 + 28);
    expect(nowOffset(grid, "2030-01-07", at(7, 8))).toBeNull();
    expect(nowOffset(grid, "2030-01-07", at(8, 10))).toBeNull();
  });

  it("labels a Closure by the edge it leaves open", () => {
    const grid = { startMinute: 14 * 60, endMinute: 24 * 60 };
    expect(
      closureTimeLabel({ startMinute: 13 * 60, endMinute: 17 * 60 }, grid),
    ).toBe("Until 5:00 PM");
    expect(
      closureTimeLabel({ startMinute: 20 * 60, endMinute: 26 * 60 }, grid),
    ).toBe("From 8:00 PM");
    expect(closureTimeLabel({ startMinute: 0, endMinute: 24 * 60 }, grid)).toBe(
      "All day",
    );
  });
});

describe("blocks", () => {
  const now = at(7, 16, 28);

  it("colours an upcoming app Booking ink, a manual one outline, an ended one muted", () => {
    expect(blockTone({ source: "app", endsAt: at(7, 18) }, now)).toBe("ink");
    expect(blockTone({ source: "venue", endsAt: at(7, 18) }, now)).toBe(
      "outline",
    );
    expect(blockTone({ source: "app", endsAt: at(7, 16, 28) }, now)).toBe(
      "muted",
    );
    expect(blockTone({ source: "venue", endsAt: at(7, 15) }, now)).toBe(
      "muted",
    );
  });

  it("writes the duration and payment on the second line", () => {
    const span = { startsAt: at(7, 18), endsAt: at(7, 19, 30) };
    expect(
      blockDetailLine({ ...span, status: "confirmed", paymentStatus: "paid" }),
    ).toBe("90 min, paid");
    expect(
      blockDetailLine({
        ...span,
        status: "confirmed",
        paymentStatus: "pending",
      }),
    ).toBe("90 min, unpaid");
    expect(
      blockDetailLine({
        ...span,
        status: "pending_payment",
        paymentStatus: "pending",
      }),
    ).toBe("90 min, awaiting payment");
    expect(
      blockDetailLine({ ...span, status: "no_show", paymentStatus: "paid" }),
    ).toBe("90 min, no-show");
  });
});

describe("scheduleStats", () => {
  const now = at(7, 12);
  const windows = [{ opensAtMinutes: 9 * 60, closesAtMinutes: 13 * 60 }];
  const booking = (
    id: string,
    startHour: number,
    endHour: number,
    extra: Partial<{
      status: "confirmed" | "pending_payment" | "no_show";
      holdExpiresAt: Date | null;
      paymentStatus: "paid" | "pending";
      priceFils: number;
    }> = {},
  ) => ({
    id,
    courtId: "c",
    startsAt: at(7, startHour),
    endsAt: at(7, endHour),
    status: "confirmed" as const,
    holdExpiresAt: null,
    paymentStatus: "paid" as const,
    priceFils: 10_000,
    ...extra,
  });

  it("clips Booking minutes to the Opening hours", () => {
    expect(
      clippedOpenMinutes(windows, { startMinute: 8 * 60, endMinute: 10 * 60 }),
    ).toBe(60);
    expect(
      clippedOpenMinutes(windows, {
        startMinute: 14 * 60,
        endMinute: 15 * 60,
      }),
    ).toBe(0);
  });

  it("counts Bookings, occupancy over open Court minutes and the sum paid", () => {
    const stats = scheduleStats({
      days: [{ day: "2030-01-07", windows }],
      bookings: [
        booking("a", 9, 11),
        booking("b", 11, 12, { paymentStatus: "pending", priceFils: 8_000 }),
        booking("c", 12, 13, { status: "no_show" }),
        booking("d", 9, 10, {
          status: "pending_payment",
          holdExpiresAt: at(7, 12, 5),
          paymentStatus: "pending",
        }),
      ],
      courtCount: 2,
      now,
    });
    expect(stats.bookings).toBe(4);
    expect(stats.occupiedPercent).toBe(50);
    expect(stats.takenFils).toBe(20_000);
  });

  it("has no occupancy when the Venue is closed and counts a Booking once across days", () => {
    const closed = scheduleStats({
      days: [{ day: "2030-01-07", windows: [] }],
      bookings: [booking("a", 9, 11)],
      courtCount: 2,
      now,
    });
    expect(closed.occupiedPercent).toBeNull();
    expect(closed.bookings).toBe(1);

    const spanning = scheduleStats({
      days: [
        { day: "2030-01-07", windows },
        { day: "2030-01-08", windows },
      ],
      bookings: [booking("a", 23, 25)],
      courtCount: 1,
      now,
    });
    expect(spanning.bookings).toBe(1);
    expect(spanning.takenFils).toBe(10_000);
  });
});
