import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  onboardingRedirectTarget,
  onboardingPhaseFromState,
  profileChecklistHref,
  profileTaskHref,
  shouldFocusStepHeading,
  type OnboardingQuestionnaireState,
} from "./onboarding-step";

function state(
  overrides: Partial<OnboardingQuestionnaireState> = {},
): OnboardingQuestionnaireState {
  return {
    provisioning: false,
    onboardingCompletedAt: null,
    ...overrides,
  };
}

describe("onboardingPhaseFromState", () => {
  it("waits while onboarding state is still loading", () => {
    assert.equal(onboardingPhaseFromState(undefined), "loading");
  });

  it("waits on the webhook race instead of rendering for a missing User", () => {
    assert.equal(
      onboardingPhaseFromState(state({ provisioning: true })),
      "provisioning",
    );
  });

  it("is ready once the user row exists, questionnaire done or not", () => {
    assert.equal(onboardingPhaseFromState(state()), "ready");
    assert.equal(
      onboardingPhaseFromState(
        state({ onboardingCompletedAt: new Date("2025-01-01T00:00:00Z") }),
      ),
      "ready",
    );
  });
});

describe("onboardingRedirectTarget", () => {
  it("carries an internal path through", () => {
    assert.equal(
      onboardingRedirectTarget("/dashboard/games/abc"),
      "/dashboard/games/abc",
    );
  });

  it("falls back to the dashboard with no redirect_url", () => {
    assert.equal(onboardingRedirectTarget(undefined), "/dashboard");
    assert.equal(onboardingRedirectTarget(null), "/dashboard");
    assert.equal(onboardingRedirectTarget(""), "/dashboard");
  });

  it("falls back to the dashboard for a hostile redirect_url", () => {
    assert.equal(onboardingRedirectTarget("//evil.com"), "/dashboard");
    assert.equal(onboardingRedirectTarget("https://evil.com"), "/dashboard");
    assert.equal(onboardingRedirectTarget("/a\\b"), "/dashboard");
    assert.equal(onboardingRedirectTarget("/@evil.com"), "/dashboard");
  });
});

describe("profile task links", () => {
  it("point at the checklist and its tasks without a query when there is no redirect_url", () => {
    assert.equal(profileChecklistHref(null), "/onboarding");
    assert.equal(profileTaskHref("photo", null), "/onboarding/photo");
  });

  it("carry redirect_url through every task", () => {
    assert.equal(
      profileChecklistHref("/dashboard"),
      "/onboarding?redirect_url=%2Fdashboard",
    );
    assert.equal(
      profileTaskHref("email", "/dashboard/you"),
      "/onboarding/email?redirect_url=%2Fdashboard%2Fyou",
    );
  });
});

describe("shouldFocusStepHeading", () => {
  it("focuses the heading when the questionnaire moves between screens", () => {
    assert.equal(shouldFocusStepHeading("sports", "padel"), true);
    assert.equal(shouldFocusStepHeading("football", "padel"), true);
    assert.equal(shouldFocusStepHeading("provisioning", "sports"), true);
  });

  it("leaves focus alone on the first load and when the screen is unchanged", () => {
    assert.equal(shouldFocusStepHeading("loading", "sports"), false);
    assert.equal(shouldFocusStepHeading("loading", "provisioning"), false);
    assert.equal(shouldFocusStepHeading("sports", "sports"), false);
  });
});
