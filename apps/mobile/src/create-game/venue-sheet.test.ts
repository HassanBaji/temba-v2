import { describe, expect, it } from "vitest";

import {
  groupSheetLabel,
  labelMatchesQuery,
  venueSheetLabel,
} from "./venue-sheet";

describe("venueSheetLabel", () => {
  it("lists all Venues before a query", () => {
    expect(venueSheetLabel("", 3)).toBe("ALL VENUES");
  });

  it("treats a whitespace query as no query", () => {
    expect(venueSheetLabel("   ", 3)).toBe("ALL VENUES");
  });

  it("counts one result in the singular", () => {
    expect(venueSheetLabel("riffa", 1)).toBe("1 RESULT");
  });

  it("counts many results in the plural", () => {
    expect(venueSheetLabel("padel", 2)).toBe("2 RESULTS");
  });

  it("counts zero results in the plural", () => {
    expect(venueSheetLabel("xyz", 0)).toBe("0 RESULTS");
  });
});

describe("groupSheetLabel", () => {
  it("lists all Groups before a query and counts after one", () => {
    expect(groupSheetLabel(" ", 9)).toBe("ALL GROUPS");
    expect(groupSheetLabel("crew", 1)).toBe("1 RESULT");
  });
});

describe("labelMatchesQuery", () => {
  it("matches every label on an empty query", () => {
    expect(labelMatchesQuery("Friday Padel", "  ")).toBe(true);
  });

  it("matches a trimmed query in any case", () => {
    expect(labelMatchesQuery("Friday Padel", " PADEL ")).toBe(true);
    expect(labelMatchesQuery("Friday Padel", "juniors")).toBe(false);
  });
});
