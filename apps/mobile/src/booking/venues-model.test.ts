import { describe, expect, it } from "vitest";

import {
  courtCountLabel,
  filterVenues,
  hoursLabel,
  minutesLabel,
  openToLabel,
  sortVenues,
  venueListMinHeight,
  venueSorts,
  venuesEmptyCopy,
} from "./venues-model";

const VENUES = [
  { name: "Seef Padel Hub", city: "Seef", fromHourlyRateFils: 10000 },
  { name: "Karbabad Courts", city: "Karbabad", fromHourlyRateFils: 8000 },
  { name: "Janabiyah Padel Park", city: "Janabiyah", fromHourlyRateFils: 8000 },
];

describe("filterVenues", () => {
  it("matches name or city, ignoring case and spaces", () => {
    expect(filterVenues(VENUES, " seef ").map((v) => v.name)).toEqual([
      "Seef Padel Hub",
    ]);
    expect(filterVenues(VENUES, "padel").map((v) => v.name)).toEqual([
      "Seef Padel Hub",
      "Janabiyah Padel Park",
    ]);
  });

  it("returns everything for an empty query", () => {
    expect(filterVenues(VENUES, "")).toHaveLength(3);
  });
});

describe("sortVenues", () => {
  it("sorts by name", () => {
    expect(sortVenues(VENUES, "name").map((v) => v.name)).toEqual([
      "Janabiyah Padel Park",
      "Karbabad Courts",
      "Seef Padel Hub",
    ]);
  });

  it("sorts by the lowest rate, then by name", () => {
    expect(sortVenues(VENUES, "cheapest").map((v) => v.name)).toEqual([
      "Janabiyah Padel Park",
      "Karbabad Courts",
      "Seef Padel Hub",
    ]);
  });
});

describe("minutesLabel", () => {
  it("writes the Venue's wall clock", () => {
    expect(minutesLabel(6 * 60, "en")).toBe("6 AM");
    expect(minutesLabel(12 * 60, "en")).toBe("12 PM");
    expect(minutesLabel(23 * 60 + 30, "en")).toBe("11:30 PM");
    expect(minutesLabel(24 * 60, "en")).toBe("Midnight");
    expect(minutesLabel(25 * 60, "en")).toBe("1 AM");
  });
});

describe("hours", () => {
  const windows = [
    { opensAtMinutes: 6 * 60, closesAtMinutes: 12 * 60 },
    { opensAtMinutes: 16 * 60, closesAtMinutes: 23 * 60 },
  ];

  it("lists each window", () => {
    expect(hoursLabel(windows, "en")).toBe("6 AM to 12 PM, 4 PM to 11 PM");
    expect(hoursLabel([], "en")).toBe("Closed");
  });

  it("reads the last closing time", () => {
    expect(openToLabel(windows, "en")).toBe("Open to 11 PM");
    expect(openToLabel([], "en")).toBe("Closed today");
  });
});

describe("copy", () => {
  it("counts Courts", () => {
    expect(courtCountLabel(1, "en")).toBe("1 court");
    expect(courtCountLabel(4, "en")).toBe("4 courts");
    expect(courtCountLabel(1, "en", "football")).toBe("1 pitch");
    expect(courtCountLabel(2, "en", "football")).toBe("2 pitches");
  });

  it("tells an empty catalog from an empty search", () => {
    expect(venuesEmptyCopy("", "en").title).toBe("No venues to book yet");
    expect(venuesEmptyCopy("zz", "en").title).toBe("No venue matches");
  });
});

describe("Arabic copy", () => {
  it("writes the clock, hours and empty state in Arabic", () => {
    expect(minutesLabel(23 * 60 + 30, "ar")).toBe("11:30 م");
    expect(minutesLabel(24 * 60, "ar")).toBe("منتصف الليل");
    expect(
      hoursLabel([{ opensAtMinutes: 6 * 60, closesAtMinutes: 12 * 60 }], "ar"),
    ).toBe("من 6 ص إلى 12 م");
    expect(openToLabel([], "ar")).toBe("مغلق اليوم");
    expect(courtCountLabel(2, "ar")).toBe("ملعبان");
    expect(venuesEmptyCopy("", "ar").title).toBe("لا أندية للحجز بعد");
    expect(venueSorts("ar").map((entry) => entry.label)).toEqual([
      "أبجديًا",
      "الأرخص",
    ]);
  });
});

describe("venueListMinHeight", () => {
  it("fills the space under the pinned filter bar", () => {
    expect(
      venueListMinHeight({
        viewportHeight: 700,
        filterBarHeight: 150,
        gap: 24,
        paddingBottom: 58,
      }),
    ).toBe(468);
  });

  it("never goes below zero before the screen is measured", () => {
    expect(
      venueListMinHeight({
        viewportHeight: 0,
        filterBarHeight: 150,
        gap: 24,
        paddingBottom: 58,
      }),
    ).toBe(0);
  });
});
