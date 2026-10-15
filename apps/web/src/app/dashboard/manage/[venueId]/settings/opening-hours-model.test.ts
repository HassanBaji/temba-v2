import { describe, expect, it } from "vitest";

import {
  formatMinutes,
  nextWindowAfter,
  productDateTimeInputToInstant,
  timeOptions,
  windowsProblem,
} from "./opening-hours-model";

describe("opening hours model", () => {
  it("formats minutes, marking the next day", () => {
    expect(formatMinutes(0)).toBe("00:00");
    expect(formatMinutes(570)).toBe("09:30");
    expect(formatMinutes(1560)).toBe("02:00 (next day)");
  });

  it("lists the grid up to 30:00", () => {
    const options = timeOptions(60);
    expect(options[0]?.value).toBe(0);
    expect(options[options.length - 1]?.value).toBe(1800);
    expect(timeOptions(30)).toHaveLength(61);
  });

  it("proposes the next window after the last", () => {
    expect(nextWindowAfter([], 30)).toEqual({ opensAtMinutes: 540, closesAtMinutes: 1320 });
    expect(nextWindowAfter([{ opensAtMinutes: 480, closesAtMinutes: 720 }], 30)).toEqual({
      opensAtMinutes: 750,
      closesAtMinutes: 990,
    });
  });

  it("explains the first problem found", () => {
    expect(windowsProblem([{ opensAtMinutes: 600, closesAtMinutes: 600 }], 30)).toMatch(/after opening/);
    expect(windowsProblem([{ opensAtMinutes: 615, closesAtMinutes: 700 }], 30)).toMatch(/grid/);
    expect(
      windowsProblem(
        [
          { opensAtMinutes: 480, closesAtMinutes: 720 },
          { opensAtMinutes: 690, closesAtMinutes: 900 },
        ],
        30,
      ),
    ).toMatch(/overlap/);
    expect(windowsProblem([{ opensAtMinutes: 480, closesAtMinutes: 720 }], 30)).toBeNull();
  });

  it("parses a datetime-local value", () => {
    const seen: unknown[] = [];
    productDateTimeInputToInstant("2026-11-03T09:30", (parts) => {
      seen.push(parts);
      return new Date(0);
    });
    expect(seen).toEqual([{ year: 2026, month: 11, day: 3, hour: 9, minute: 30 }]);
    expect(productDateTimeInputToInstant("", () => new Date(0))).toBeNull();
  });
});
