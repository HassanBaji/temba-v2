import { describe, expect, it } from "vitest";

import {
  birthDateEntry,
  birthDateParts,
  othersSeeLabel,
  profileCompletion,
  type ProfileCompletionInput,
} from "./settings-model";

const complete: ProfileCompletionInput = {
  hasName: true,
  hasPhone: true,
  hasPhoto: true,
  emailVerified: true,
  sportCount: 1,
  gender: "male",
  birthDate: "1996-03-14",
  homeArea: "Seef",
  playWindowCount: 2,
};

describe("profileCompletion", () => {
  it("counts everything sign up asks for", () => {
    expect(profileCompletion(complete, "en")).toEqual({
      done: 7,
      total: 7,
      missing: [],
      left: null,
    });
  });

  it("lists what is left in Settings order", () => {
    const result = profileCompletion(
      { ...complete, emailVerified: false, playWindowCount: 0 },
      "en",
    );
    expect(result.done).toBe(5);
    expect(result.missing).toEqual(["email", "playWindows"]);
    expect(result.left).toBe("Left: verify email, when you usually play");
  });

  it("needs gender, birth date and home area for the details", () => {
    expect(
      profileCompletion({ ...complete, homeArea: null }, "en").missing,
    ).toEqual(["details"]);
  });
});

describe("birthDateParts", () => {
  it("splits a stored date and leaves no date blank", () => {
    expect(birthDateParts("1996-03-14")).toEqual({
      day: "14",
      month: "03",
      year: "1996",
    });
    expect(birthDateParts(null)).toEqual({ day: "", month: "", year: "" });
  });
});

describe("birthDateEntry", () => {
  const today = "2026-11-04";

  it("reads blank fields as no birth date", () => {
    expect(birthDateEntry({ day: "", month: " ", year: "" }, today)).toEqual({
      kind: "empty",
    });
  });

  it("pads a real date", () => {
    expect(
      birthDateEntry({ day: "4", month: "3", year: "1996" }, today),
    ).toEqual({ kind: "date", value: "1996-03-04" });
  });

  it("refuses a half-typed or impossible date", () => {
    expect(
      birthDateEntry({ day: "4", month: "", year: "1996" }, today),
    ).toEqual({ kind: "problem", problem: "invalid" });
    expect(
      birthDateEntry({ day: "31", month: "2", year: "1996" }, today),
    ).toEqual({ kind: "problem", problem: "invalid" });
  });

  it("refuses anyone under 16", () => {
    expect(
      birthDateEntry({ day: "5", month: "11", year: "2010" }, today),
    ).toEqual({ kind: "problem", problem: "tooYoung" });
  });
});

describe("othersSeeLabel", () => {
  it("names the age group others see", () => {
    const today = "2026-11-04";
    expect(
      othersSeeLabel({ kind: "date", value: "1996-03-14" }, today, "en"),
    ).toBe("others see 25 to 34 only");
    expect(othersSeeLabel({ kind: "empty" }, today, "en")).toBeNull();
  });
});
