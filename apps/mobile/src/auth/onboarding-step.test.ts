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
