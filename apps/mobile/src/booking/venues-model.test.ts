import { describe, expect, it } from "vitest";

import {
  courtCountLabel,
  filterVenues,
  hoursLabel,
  minutesLabel,
  openToLabel,
  sortVenues,
  venueListMinHeight,
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
    expect(minutesLabel(6 * 60)).toBe("6 AM");
    expect(minutesLabel(12 * 60)).toBe("12 PM");
    expect(minutesLabel(23 * 60 + 30)).toBe("11:30 PM");
    expect(minutesLabel(24 * 60)).toBe("Midnight");
    expect(minutesLabel(25 * 60)).toBe("1 AM");
  });
});

describe("hours", () => {
  const windows = [
    { opensAtMinutes: 6 * 60, closesAtMinutes: 12 * 60 },
    { opensAtMinutes: 16 * 60, closesAtMinutes: 23 * 60 },
  ];

  it("lists each window", () => {
    expect(hoursLabel(windows)).toBe("6 AM to 12 PM, 4 PM to 11 PM");
    expect(hoursLabel([])).toBe("Closed");
  });

  it("reads the last closing time", () => {
    expect(openToLabel(windows)).toBe("Open to 11 PM");
    expect(openToLabel([])).toBe("Closed today");
  });
});

describe("copy", () => {
  it("counts Courts", () => {
    expect(courtCountLabel(1)).toBe("1 court");
    expect(courtCountLabel(4)).toBe("4 courts");
  });

  it("tells an empty catalog from an empty search", () => {
    expect(venuesEmptyCopy("").title).toBe("No venues to book yet");
    expect(venuesEmptyCopy("zz").title).toBe("No venue matches");
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
