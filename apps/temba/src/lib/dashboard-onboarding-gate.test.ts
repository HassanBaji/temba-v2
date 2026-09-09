import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  dashboardOnboardingRedirect,
  ONBOARDING_PATH,
  type DashboardOnboardingState,
} from "./dashboard-onboarding-gate";

const COMPLETE: DashboardOnboardingState = {
  provisioning: false,
  onboardingCompletedAt: new Date("2026-01-01T00:00:00Z"),
};

const INCOMPLETE: DashboardOnboardingState = {
  provisioning: false,
  onboardingCompletedAt: null,
};

const PROVISIONING: DashboardOnboardingState = {
  provisioning: true,
  onboardingCompletedAt: null,
};

function gate(
  pathname: string | null | undefined,
  state: DashboardOnboardingState,
  designPreviewExempt = false,
) {
  return dashboardOnboardingRedirect({ pathname, state, designPreviewExempt });
}

describe("dashboardOnboardingRedirect", () => {
  it("sends an incomplete User to the questionnaire", () => {
    assert.equal(
      gate("/dashboard", INCOMPLETE),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard`,
    );
  });

  it("carries the exact dashboard path through as redirect_url", () => {
    assert.equal(
      gate("/dashboard/games/abc123", INCOMPLETE),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard%2Fgames%2Fabc123`,
    );
  });

  it("carries a Game Invite landing path through as redirect_url", () => {
    assert.equal(
      gate("/dashboard/games/game_42", PROVISIONING),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard%2Fgames%2Fgame_42`,
    );
  });

  it("keeps the query string on the path it returns to", () => {
    assert.equal(
      gate("/dashboard/games?tab=upcoming", INCOMPLETE),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard%2Fgames%3Ftab%3Dupcoming`,
    );
  });

  it("redirects rather than throwing while the user row is still provisioning", () => {
    assert.equal(
      gate("/dashboard/you", PROVISIONING),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard%2Fyou`,
    );
  });

  it("never redirects a complete User", () => {
    assert.equal(gate("/dashboard", COMPLETE), null);
    assert.equal(gate("/dashboard/you", COMPLETE), null);
    assert.equal(gate("/dashboard/games/abc123?tab=teams", COMPLETE), null);
  });

  it("never redirects a complete User even with no pathname header", () => {
    assert.equal(gate(null, COMPLETE), null);
  });

  it("falls back to a bare questionnaire when no pathname header arrived", () => {
    assert.equal(gate(null, INCOMPLETE), ONBOARDING_PATH);
    assert.equal(gate(undefined, INCOMPLETE), ONBOARDING_PATH);
    assert.equal(gate("", INCOMPLETE), ONBOARDING_PATH);
  });

  it("drops a path safeInternalRedirect refuses instead of building an open redirect", () => {
    assert.equal(gate("//evil.example.com", INCOMPLETE), ONBOARDING_PATH);
    assert.equal(gate("https://evil.example.com", INCOMPLETE), ONBOARDING_PATH);
    assert.equal(
      gate("/dashboard@evil.example.com", INCOMPLETE),
      ONBOARDING_PATH,
    );
    assert.equal(gate("/dashboard\\evil", INCOMPLETE), ONBOARDING_PATH);
  });

  it("lets the development design preview render un-onboarded", () => {
    assert.equal(gate("/dashboard/design", PROVISIONING, true), null);
    assert.equal(gate("/dashboard/design/home", PROVISIONING, true), null);
    assert.equal(
      gate("/dashboard/design/home?state=empty", INCOMPLETE, true),
      null,
    );
  });

  it("gates the design preview outside development", () => {
    assert.equal(
      gate("/dashboard/design", INCOMPLETE, false),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard%2Fdesign`,
    );
  });

  it("does not let a design-look-alike path slip past the gate", () => {
    assert.equal(
      gate("/dashboard/designs", INCOMPLETE, true),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard%2Fdesigns`,
    );
    assert.equal(
      gate("/dashboard/design-system", INCOMPLETE, true),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard%2Fdesign-system`,
    );
  });
});
