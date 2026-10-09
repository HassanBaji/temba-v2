import { bahrainDate } from "@repo/domain/bahrain-date.test-support";
import { describe, expect, it } from "vitest";

import {
  dateSheetStartMonth,
  monthGrid,
  shiftMonth,
  visibleDayOptions,
} from "./create-days";

const NOW = bahrainDate(2026, 9, 4, 12, 0, 0);

describe("visibleDayOptions", () => {
  it("lists five days from today with weekday and date", () => {
    expect(visibleDayOptions(NOW, "2026-10-04").cells).toEqual([
      { value: "2026-10-04", weekday: "Today", date: 4 },
      { value: "2026-10-05", weekday: "Mon", date: 5 },
      { value: "2026-10-06", weekday: "Tue", date: 6 },
      { value: "2026-10-07", weekday: "Wed", date: 7 },
      { value: "2026-10-08", weekday: "Thu", date: 8 },
    ]);
  });

  it("keeps the link text when the selected day is inside the strip", () => {
    expect(visibleDayOptions(NOW, "2026-10-07").laterLabel).toBe(null);
  });

  it("names a selected day beyond the strip", () => {
    expect(visibleDayOptions(NOW, "2026-10-20").laterLabel).toBe(
      "Tue 20 Oct 2026",
    );
  });

  it("keeps the link text before a day is picked", () => {
    expect(visibleDayOptions(NOW, "").laterLabel).toBe(null);
  });

  it("starts tomorrow once today has no upcoming slot", () => {
    const late = bahrainDate(2026, 9, 4, 23, 45, 0);
    const { cells } = visibleDayOptions(late, "");
    expect(cells[0]).toEqual({ value: "2026-10-05", weekday: "Mon", date: 5 });
  });
});

describe("monthGrid", () => {
  const leadingBlanks = (month: string) =>
    monthGrid(month, "2026-01-01").weeks[0]?.findIndex((cell) => cell !== null);

  it("places the first of the month under its weekday, Sunday first", () => {
    expect(leadingBlanks("2026-02")).toBe(0);
    expect(leadingBlanks("2026-06")).toBe(1);
    expect(leadingBlanks("2026-09")).toBe(2);
    expect(leadingBlanks("2026-04")).toBe(3);
    expect(leadingBlanks("2026-01")).toBe(4);
    expect(leadingBlanks("2026-05")).toBe(5);
    expect(leadingBlanks("2026-08")).toBe(6);
  });

  it("pads every week to seven cells", () => {
    const grid = monthGrid("2026-08", "2026-01-01");
    expect(grid.weeks).toHaveLength(6);
    for (const week of grid.weeks) {
      expect(week).toHaveLength(7);
    }
    expect(grid.weeks.flat().filter(Boolean)).toHaveLength(31);
  });

  it("fits a February starting on Sunday in four weeks", () => {
    expect(monthGrid("2026-02", "2026-01-01").weeks).toHaveLength(4);
  });

  it("gives a leap February its 29th", () => {
    const grid = monthGrid("2028-02", "2026-01-01");
    const days = grid.weeks.flat().filter((cell) => cell !== null);
    expect(days).toHaveLength(29);
    expect(days.at(-1)).toEqual({
      value: "2028-02-29",
      date: 29,
      disabled: false,
    });
    expect(grid.label).toBe("February 2028");
  });

  it("disables the days before the earliest day", () => {
    const grid = monthGrid("2026-10", "2026-10-04");
    const days = grid.weeks.flat().filter((cell) => cell !== null);
    expect(
      days.filter((cell) => cell.disabled).map((cell) => cell.date),
    ).toEqual([1, 2, 3]);
    expect(days.find((cell) => cell.date === 4)?.disabled).toBe(false);
  });

  it("disables a whole month before the earliest day", () => {
    const days = monthGrid("2026-09", "2026-10-04")
      .weeks.flat()
      .filter((cell) => cell !== null);
    expect(days.every((cell) => cell.disabled)).toBe(true);
  });

  it("offers no previous month at the earliest month", () => {
    const grid = monthGrid("2026-10", "2026-10-04");
    expect(grid.label).toBe("October 2026");
    expect(grid.previous).toBe(null);
    expect(grid.next).toBe("2026-11");
  });

  it("steps back to the earliest month from a later one", () => {
    expect(monthGrid("2026-11", "2026-10-04").previous).toBe("2026-10");
  });

  it("crosses the year in both directions", () => {
    expect(monthGrid("2026-12", "2026-10-04").next).toBe("2027-01");
    expect(monthGrid("2027-01", "2026-10-04").previous).toBe("2026-12");
  });

  it("falls back to the earliest month for an invalid month", () => {
    expect(monthGrid("soon", "2026-10-04").month).toBe("2026-10");
  });
});

describe("shiftMonth", () => {
  it("moves by whole months", () => {
    expect(shiftMonth("2026-10", 3)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("dateSheetStartMonth", () => {
  it("opens on the selected day's month", () => {
    expect(dateSheetStartMonth("2026-12-24", "2026-10-04")).toBe("2026-12");
  });

  it("opens on the earliest month without a usable selection", () => {
    expect(dateSheetStartMonth("", "2026-10-04")).toBe("2026-10");
    expect(dateSheetStartMonth("2026-09-30", "2026-10-04")).toBe("2026-10");
  });
});
