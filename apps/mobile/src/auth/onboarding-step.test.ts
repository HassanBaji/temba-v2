import { describe, expect, it } from "vitest";

import {
  canReachTabs,
  onboardingStepFromState,
  type OnboardingQuestionnaireState,
} from "./onboarding-step";

const base: OnboardingQuestionnaireState = {
  provisioning: false,
  preferredPosition: null,
  onboardingCompletedAt: null,
  hasRating: false,
};

describe("onboardingStepFromState", () => {
  it("waits while the state has not loaded", () => {
    expect(onboardingStepFromState(undefined)).toBe("loading");
  });

  it("holds a User whose row is still being created", () => {
    expect(onboardingStepFromState({ ...base, provisioning: true })).toBe(
      "provisioning",
    );
  });

  it("asks Preferred Position first", () => {
    expect(onboardingStepFromState(base)).toBe("position");
  });

  it("asks the Level declaration once the position is answered", () => {
    expect(
      onboardingStepFromState({ ...base, preferredPosition: "left" }),
    ).toBe("level");
  });

  it("finishes once both answers exist", () => {
    expect(
      onboardingStepFromState({
        ...base,
        preferredPosition: "either",
        hasRating: true,
      }),
    ).toBe("finishing");
  });

  it("releases a completed User, even one backfilled with no position", () => {
    expect(
      onboardingStepFromState({
        ...base,
        onboardingCompletedAt: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toBe("complete");
  });
});

describe("canReachTabs", () => {
  it("opens only for a completed questionnaire", () => {
    expect(canReachTabs("complete")).toBe(true);
    for (const step of [
      "loading",
      "provisioning",
      "position",
      "level",
      "finishing",
    ] as const) {
      expect(canReachTabs(step)).toBe(false);
    }
  });
});
