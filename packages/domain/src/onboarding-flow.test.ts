import { describe, expect, it } from "vitest";

import {
  adjacentQuestion,
  findGamesLabel,
  onboardingProgress,
  onboardingQuestions,
  sportsContinueLabel,
} from "./onboarding-flow";

const both = { padel: true, football: true };
const padelOnly = { padel: true, football: false };
const footballOnly = { padel: false, football: true };
const none = { padel: false, football: false };

describe("onboardingQuestions", () => {
  it("asks one question per picked sport", () => {
    expect(onboardingQuestions(both)).toEqual([
      "sports",
      "padel",
      "football",
      "ready",
    ]);
    expect(onboardingQuestions(footballOnly)).toEqual([
      "sports",
      "football",
      "ready",
    ]);
  });
});

describe("adjacentQuestion", () => {
  it("skips the sport that was not picked", () => {
    expect(adjacentQuestion(footballOnly, "sports", "next")).toBe("football");
    expect(adjacentQuestion(padelOnly, "padel", "next")).toBe("ready");
    expect(adjacentQuestion(footballOnly, "ready", "back")).toBe("football");
  });

  it("has nothing before the sports question", () => {
    expect(adjacentQuestion(both, "sports", "back")).toBeNull();
  });
});

describe("onboardingProgress", () => {
  it("counts the steps the picked sports need", () => {
    expect(onboardingProgress(both, "football")).toEqual({
      step: 3,
      total: 4,
    });
    expect(onboardingProgress(padelOnly, "ready")).toEqual({
      step: 3,
      total: 3,
    });
  });
});

describe("labels", () => {
  it("names what the next step covers", () => {
    expect(sportsContinueLabel(none)).toBe("Pick at least one");
    expect(sportsContinueLabel(both)).toBe("Continue with both");
    expect(sportsContinueLabel(footballOnly)).toBe("Continue with football");
    expect(findGamesLabel(padelOnly)).toBe("Find padel games");
    expect(findGamesLabel(both)).toBe("Find games");
  });
});
