import { describe, expect, it } from "vitest";

import { canReachTabs, onboardingPhaseFromState } from "./onboarding-step";

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

  it("reports open questions until onboarding is complete", () => {
    expect(
      onboardingPhaseFromState({
        provisioning: false,
        onboardingCompletedAt: null,
      }),
    ).toBe("questions");
  });

  it("reports complete once the questionnaire was saved", () => {
    expect(
      onboardingPhaseFromState({
        provisioning: false,
        onboardingCompletedAt: new Date(),
      }),
    ).toBe("complete");
  });
});

describe("canReachTabs", () => {
  it("lets a User through with or without the questionnaire answered", () => {
    expect(canReachTabs("complete")).toBe(true);
    expect(canReachTabs("questions")).toBe(true);
  });

  it("holds only loading and provisioning", () => {
    expect(canReachTabs("loading")).toBe(false);
    expect(canReachTabs("provisioning")).toBe(false);
  });
});
