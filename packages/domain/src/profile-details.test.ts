import { describe, expect, it } from "vitest";

import {
  ageGroup,
  ageGroupLabel,
  ageOn,
  birthDateProblem,
  nationalityLabel,
  playWindow,
  playWindowsSummary,
} from "./profile-details";

describe("ageOn", () => {
  it("counts whole years and waits for the birthday", () => {
    expect(ageOn("1996-03-14", "2026-03-13")).toBe(29);
    expect(ageOn("1996-03-14", "2026-03-14")).toBe(30);
  });
});

describe("ageGroup", () => {
  it("brackets ages in tens from 25", () => {
    expect(ageGroup(16)).toEqual({ from: 16, to: 24 });
    expect(ageGroup(25)).toEqual({ from: 25, to: 34 });
    expect(ageGroup(34)).toEqual({ from: 25, to: 34 });
    expect(ageGroup(47)).toEqual({ from: 45, to: 54 });
    expect(ageGroup(55)).toEqual({ from: 55, to: null });
  });

  it("labels a bracket", () => {
    expect(ageGroupLabel(30, "en")).toBe("25 to 34");
    expect(ageGroupLabel(60, "en")).toBe("55 and over");
  });
});

describe("birthDateProblem", () => {
  const today = "2026-11-04";

  it("accepts a real date 16 or more years back", () => {
    expect(birthDateProblem("1996-03-14", today)).toBeNull();
    expect(birthDateProblem("2010-11-04", today)).toBeNull();
  });

  it("refuses someone under 16", () => {
    expect(birthDateProblem("2010-11-05", today)).toBe("tooYoung");
  });

  it("refuses a date that does not exist", () => {
    expect(birthDateProblem("1996-02-30", today)).toBe("invalid");
    expect(birthDateProblem("96-2-3", today)).toBe("invalid");
    expect(birthDateProblem("2030-01-01", today)).toBe("invalid");
  });
});

describe("playWindowsSummary", () => {
  it("lists picked windows in week order", () => {
    expect(
      playWindowsSummary(
        [playWindow("weekend", "morning"), playWindow("weekday", "evening")],
        "en",
      ),
    ).toBe("Weekday evenings, weekend mornings");
  });

  it("is null when nothing is picked", () => {
    expect(playWindowsSummary([], "en")).toBeNull();
  });
});

describe("nationalityLabel", () => {
  it("names a known code and falls back to the code", () => {
    expect(nationalityLabel("BH", "en")).toBe("Bahraini");
    expect(nationalityLabel("ZZ", "en")).toBe("ZZ");
  });
});
