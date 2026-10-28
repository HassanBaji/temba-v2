import { describe, expect, it } from "vitest";

import {
  adjacentQuestion,
  canReachTabs,
  findGamesLabel,
  onboardingPhaseFromState,
  onboardingQuestions,
  sportsContinueLabel,
} from "./onboarding-step";

const both = { padel: true, football: true };
const padelOnly = { padel: true, football: false };
const footballOnly = { padel: false, football: true };
const none = { padel: false, football: false };

describe("onboardingPhaseFromState", () => {
  it("waits while the state has not loaded", () => {
    expect(onboardingPhaseFromState(undefined)).toBe("loading");
  });

  it("holds a User whose row is still being created", () => {
    expect(
      onboardingPhaseFromState({
        provisioning: true,
        onboardingCompletedAt: null,
      }),
    ).toBe("provisioning");
  });

  it("asks the questions until onboarding is complete", () => {
    expect(
      onboardingPhaseFromState({
        provisioning: false,
        onboardingCompletedAt: null,
      }),
    ).toBe("questions");
  });

  it("lets a complete User reach the tabs", () => {
    const phase = onboardingPhaseFromState({
      provisioning: false,
      onboardingCompletedAt: new Date(),
    });
    expect(phase).toBe("complete");
    expect(canReachTabs(phase)).toBe(true);
    expect(canReachTabs("questions")).toBe(false);
  });
});

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

describe("labels", () => {
  it("names what the next step covers", () => {
    expect(sportsContinueLabel(none)).toBe("Pick at least one");
    expect(sportsContinueLabel(both)).toBe("Continue with both");
    expect(sportsContinueLabel(footballOnly)).toBe("Continue with football");
    expect(findGamesLabel(padelOnly)).toBe("Find padel games");
    expect(findGamesLabel(both)).toBe("Find games");
  });
});
