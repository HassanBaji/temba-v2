import { describe, expect, it, vi } from "vitest";

import {
  WEEKDAY_ORDER,
  formatClock,
  formatMinutes,
  formatOpenHours,
  hoursAreEqual,
  nextWindowAfter,
  productDateTimeInputToInstant,
  saveWeekdays,
  timeOptions,
  windowsProblem,
} from "./opening-hours-model";

describe("opening hours model", () => {
  it("runs the week from Sunday, as the design's Weekly hours card does", () => {
    expect(WEEKDAY_ORDER).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("formats minutes, marking the next day", () => {
    expect(formatMinutes(0, "en")).toBe("00:00");
    expect(formatMinutes(570, "en")).toBe("09:30");
    expect(formatMinutes(1560, "en")).toBe("02:00 (next day)");
    expect(formatMinutes(1560, "ar")).toBe("02:00 (اليوم التالي)");
  });

  it("formats clock times on a 12-hour clock", () => {
    expect(formatClock(7 * 60, "en")).toBe("7:00 AM");
    expect(formatClock(23 * 60, "en")).toBe("11:00 PM");
    expect(formatClock(1500, "en")).toBe("1:00 AM");
  });

  it("lists the grid up to 30:00", () => {
    const options = timeOptions(60, "en");
    expect(options[0]).toEqual({ value: 0, label: "12:00 AM" });
    expect(options[options.length - 1]?.value).toBe(1800);
    expect(timeOptions(30, "en")).toHaveLength(61);
  });

  it("totals the open hours of a day", () => {
    expect(formatOpenHours([], "en")).toBe("0h");
    expect(
      formatOpenHours(
        [{ opensAtMinutes: 7 * 60, closesAtMinutes: 23 * 60 }],
        "en",
      ),
    ).toBe("16h");
    expect(
      formatOpenHours(
        [
          { opensAtMinutes: 7 * 60, closesAtMinutes: 12 * 60 },
          { opensAtMinutes: 16 * 60, closesAtMinutes: 23 * 60 + 30 },
        ],
        "en",
      ),
    ).toBe("12.5h");
    expect(
      formatOpenHours(
        [{ opensAtMinutes: 7 * 60, closesAtMinutes: 1500 }],
        "en",
      ),
    ).toBe("18h");
  });

  it("compares windows by content", () => {
    const windows = [{ opensAtMinutes: 420, closesAtMinutes: 1380 }];
    expect(hoursAreEqual(windows, [{ ...windows[0]! }])).toBe(true);
    expect(hoursAreEqual(windows, [])).toBe(false);
  });

  it("proposes the next window after the last", () => {
    expect(nextWindowAfter([], 30)).toEqual({
      opensAtMinutes: 540,
      closesAtMinutes: 1320,
    });
    expect(
      nextWindowAfter([{ opensAtMinutes: 480, closesAtMinutes: 720 }], 30),
    ).toEqual({
      opensAtMinutes: 750,
      closesAtMinutes: 990,
    });
  });

  it("explains the first problem found", () => {
    expect(
      windowsProblem([{ opensAtMinutes: 600, closesAtMinutes: 600 }], 30, "en"),
    ).toMatch(/after opening/);
    expect(
      windowsProblem([{ opensAtMinutes: 615, closesAtMinutes: 700 }], 30, "en"),
    ).toMatch(/grid/);
    expect(
      windowsProblem(
        [
          { opensAtMinutes: 480, closesAtMinutes: 720 },
          { opensAtMinutes: 690, closesAtMinutes: 900 },
        ],
        30,
        "en",
      ),
    ).toMatch(/overlap/);
    expect(
      windowsProblem([{ opensAtMinutes: 480, closesAtMinutes: 720 }], 30, "en"),
    ).toBeNull();
  });

  it("refreshes after a partial save and still reports the failure", async () => {
    const saved: number[] = [];
    const refresh = vi.fn(async () => undefined);
    const save = async (weekday: number) => {
      if (weekday === 3) {
        throw new Error("refused");
      }
      saved.push(weekday);
    };

    await expect(saveWeekdays([1, 2, 3, 4], save, refresh)).rejects.toThrow(
      "refused",
    );
    expect(saved).toEqual([1, 2]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes once after every weekday saves", async () => {
    const refresh = vi.fn(async () => undefined);
    await saveWeekdays([0, 6], async () => undefined, refresh);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("parses a datetime-local value", () => {
    const seen: unknown[] = [];
    productDateTimeInputToInstant("2026-11-03T09:30", (parts) => {
      seen.push(parts);
      return new Date(0);
    });
    expect(seen).toEqual([
      { year: 2026, month: 11, day: 3, hour: 9, minute: 30 },
    ]);
    expect(productDateTimeInputToInstant("", () => new Date(0))).toBeNull();
  });
});
