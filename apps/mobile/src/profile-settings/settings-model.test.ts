import { levelFromOvr } from "@repo/domain/football-ovr";
import { describe, expect, it } from "vitest";

import {
  birthDateParts,
  displayPhone,
  footballSavePlan,
  footballSportSub,
  hasDetails,
  padelSportSub,
  playWindowGrid,
  readBirthDate,
  togglePlayWindow,
} from "./settings-model";

describe("hasDetails", () => {
  it("needs gender, birth date and home area; nationality is optional", () => {
    expect(
      hasDetails({ gender: "male", birthDate: "1996-03-14", homeArea: "Seef" }),
    ).toBe(true);
    expect(
      hasDetails({ gender: "male", birthDate: null, homeArea: "Seef" }),
    ).toBe(false);
  });
});

describe("sport rows", () => {
  it("reads padel with its general Level and side", () => {
    expect(padelSportSub({ levelBand: "C1", rating: 3.21 }, "left", "en")).toBe(
      "C+ 3.21 general · Left side",
    );
    expect(padelSportSub(null, null, "en")).toBe("No level yet · Not set");
  });

  it("reads football with its OVR and role", () => {
    expect(
      footballSportSub(
        levelFromOvr(72),
        { role: "keeper", position: null },
        "en",
      ),
    ).toBe("OVR 72 · Keeper");
    expect(
      footballSportSub(null, { role: "keeper", position: null }, "en"),
    ).toBe("No level yet · Keeper");
  });
});

describe("play windows", () => {
  it("toggles a window and keeps the stored order", () => {
    expect(togglePlayWindow(["weekend_morning"], "weekday_evening")).toEqual([
      "weekday_evening",
      "weekend_morning",
    ]);
    expect(togglePlayWindow(["weekday_evening"], "weekday_evening")).toEqual(
      [],
    );
  });

  it("lays out weekday and weekend by morning, afternoon, evening", () => {
    const grid = playWindowGrid(["weekend_evening"], "en");
    expect(grid.map((row) => row.label)).toEqual(["Weekday", "Weekend"]);
    expect(grid[1]?.cells[2]).toEqual({
      value: "weekend_evening",
      on: true,
      spoken: "Weekend Evening",
    });
  });
});

describe("birth date", () => {
  const today = "2026-11-04";

  it("splits a stored date into its fields", () => {
    expect(birthDateParts("1996-03-14")).toEqual({
      day: "14",
      month: "03",
      year: "1996",
    });
    expect(birthDateParts(null)).toEqual({ day: "", month: "", year: "" });
  });

  it("reads three empty fields as no birth date", () => {
    expect(
      readBirthDate({ day: "", month: "", year: "" }, today, "en"),
    ).toEqual({ kind: "empty" });
  });

  it("pads the fields and shows the age group others see", () => {
    expect(
      readBirthDate({ day: "14", month: "3", year: "1996" }, today, "en"),
    ).toEqual({
      kind: "valid",
      value: "1996-03-14",
      othersSee: "others see 25 to 34 only",
    });
  });

  it("refuses an impossible day and anyone under 16", () => {
    expect(
      readBirthDate({ day: "31", month: "02", year: "1996" }, today, "en").kind,
    ).toBe("invalid");
    expect(
      readBirthDate({ day: "1", month: "1", year: "2015" }, today, "en"),
    ).toEqual({
      kind: "invalid",
      message: "You must be 16 or older to use Temba.",
    });
  });
});

describe("displayPhone", () => {
  it("spaces a known number and leaves anything else as stored", () => {
    expect(displayPhone("+97336124408")).toBe("+973 3612 4408");
    expect(displayPhone("12345")).toBe("12345");
  });
});

describe("footballSavePlan", () => {
  const base = {
    setUp: false,
    onboardingComplete: false,
    sports: ["padel"],
    hasPadelRating: true,
    hasFootballRating: false,
  };

  it("saves every answer through onboarding while it is open", () => {
    expect(footballSavePlan(base)).toEqual({ kind: "onboarding" });
  });

  it("never declares padel on the way", () => {
    expect(footballSavePlan({ ...base, hasPadelRating: false })).toEqual({
      kind: "direct",
      declare: true,
      addSport: true,
    });
  });

  it("only declares and adds once onboarding is done", () => {
    expect(
      footballSavePlan({
        ...base,
        onboardingComplete: true,
        setUp: true,
        hasFootballRating: true,
      }),
    ).toEqual({ kind: "direct", declare: false, addSport: false });
  });
});
