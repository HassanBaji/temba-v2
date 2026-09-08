import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  onboardingRedirectTarget,
  onboardingStepFromState,
  type OnboardingQuestionnaireState,
} from "./onboarding-step";

function state(
  overrides: Partial<OnboardingQuestionnaireState> = {},
): OnboardingQuestionnaireState {
  return {
    provisioning: false,
    preferredPosition: null,
    onboardingCompletedAt: null,
    hasRating: false,
    ...overrides,
  };
}

describe("onboardingStepFromState", () => {
  it("waits while onboarding state is still loading", () => {
    assert.equal(onboardingStepFromState(undefined), "loading");
  });

  it("waits on the webhook race instead of questioning a missing User", () => {
    assert.equal(
      onboardingStepFromState(state({ provisioning: true })),
      "provisioning",
    );
  });

  it("opens step one when Preferred Position is unanswered", () => {
    assert.equal(onboardingStepFromState(state()), "position");
  });

  it("resumes on step two when Preferred Position is set and there is no Rating", () => {
    assert.equal(
      onboardingStepFromState(state({ preferredPosition: "either" })),
      "level",
    );
  });

  it("finishes once both questions are answered", () => {
    assert.equal(
      onboardingStepFromState(
        state({ preferredPosition: "left", hasRating: true }),
      ),
      "finishing",
    );
  });

  it("sends a completed User onward rather than re-running the questionnaire", () => {
    assert.equal(
      onboardingStepFromState(
        state({
          preferredPosition: "right",
          hasRating: true,
          onboardingCompletedAt: new Date("2026-01-01T00:00:00Z"),
        }),
      ),
      "complete",
    );
  });

  it("sends a backfilled User onward even with no Preferred Position", () => {
    assert.equal(
      onboardingStepFromState(
        state({ onboardingCompletedAt: new Date("2025-01-01T00:00:00Z") }),
      ),
      "complete",
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
