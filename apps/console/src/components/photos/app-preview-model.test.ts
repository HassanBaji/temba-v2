import { describe, expect, it } from "vitest";

import {
  courtCountLabel,
  fromPriceLabel,
  openToLabel,
  todayWindows,
} from "./app-preview-model";

describe("openToLabel", () => {
  it("names the last closing time of the day", () => {
    expect(
      openToLabel([
        { opensAtMinutes: 360, closesAtMinutes: 720 },
        { opensAtMinutes: 960, closesAtMinutes: 1410 },
      ]),
    ).toBe("Open to 11:30 PM");
    expect(openToLabel([{ opensAtMinutes: 360, closesAtMinutes: 1440 }])).toBe(
      "Open to Midnight",
    );
    expect(openToLabel([{ opensAtMinutes: 960, closesAtMinutes: 1500 }])).toBe(
      "Open to 1 AM",
    );
  });

  it("says closed for a day without windows", () => {
    expect(openToLabel([])).toBe("Closed today");
  });
});

describe("todayWindows", () => {
  it("keeps the product-timezone weekday's windows", () => {
    const sundayEveningInBahrain = new Date("2026-10-18T20:00:00Z");
    const hours = [
      { weekday: 0, opensAtMinutes: 360, closesAtMinutes: 1320 },
      { weekday: 1, opensAtMinutes: 420, closesAtMinutes: 1380 },
    ];
    expect(todayWindows(hours, sundayEveningInBahrain)).toEqual([hours[0]]);
    const mondayAfterMidnightInBahrain = new Date("2026-10-18T21:30:00Z");
    expect(todayWindows(hours, mondayAfterMidnightInBahrain)).toEqual([
      hours[1],
    ]);
  });
});

describe("fromPriceLabel", () => {
  it("prices from the cheapest rule", () => {
    expect(
      fromPriceLabel([{ hourlyRateFils: 12_000 }, { hourlyRateFils: 8_000 }]),
    ).toBe(fromPriceLabel([{ hourlyRateFils: 8_000 }]));
    expect(fromPriceLabel([])).toBeNull();
  });
});

describe("courtCountLabel", () => {
  it("counts courts", () => {
    expect(courtCountLabel(1)).toBe("1 court");
    expect(courtCountLabel(4)).toBe("4 courts");
  });
});
