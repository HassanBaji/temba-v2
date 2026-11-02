import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  dashboardOnboardingRedirect,
  ONBOARDING_PATH,
  type DashboardOnboardingState,
} from "./dashboard-onboarding-gate";

const READY: DashboardOnboardingState = { provisioning: false };

const PROVISIONING: DashboardOnboardingState = { provisioning: true };

function gate(
  pathname: string | null | undefined,
  state: DashboardOnboardingState,
  designPreviewExempt = false,
) {
  return dashboardOnboardingRedirect({ pathname, state, designPreviewExempt });
}

describe("dashboardOnboardingRedirect", () => {
  it("sends a provisioning User to the wait screen", () => {
    assert.equal(
      gate("/dashboard", PROVISIONING),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard`,
    );
  });

  it("carries the exact dashboard path through as redirect_url", () => {
    assert.equal(
      gate("/dashboard/games/abc123", PROVISIONING),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard%2Fgames%2Fabc123`,
    );
  });

  it("keeps the query string on the path it returns to", () => {
    assert.equal(
      gate("/dashboard/games?tab=upcoming", PROVISIONING),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard%2Fgames%3Ftab%3Dupcoming`,
    );
  });

  it("never redirects once the user row exists, questionnaire done or not", () => {
    assert.equal(gate("/dashboard", READY), null);
    assert.equal(gate("/dashboard/you", READY), null);
    assert.equal(gate("/dashboard/games/abc123?tab=teams", READY), null);
    assert.equal(gate(null, READY), null);
  });

  it("falls back to a bare wait screen when no pathname header arrived", () => {
    assert.equal(gate(null, PROVISIONING), ONBOARDING_PATH);
    assert.equal(gate(undefined, PROVISIONING), ONBOARDING_PATH);
    assert.equal(gate("", PROVISIONING), ONBOARDING_PATH);
  });

  it("drops a path safeInternalRedirect refuses instead of building an open redirect", () => {
    assert.equal(gate("//evil.example.com", PROVISIONING), ONBOARDING_PATH);
    assert.equal(
      gate("https://evil.example.com", PROVISIONING),
      ONBOARDING_PATH,
    );
    assert.equal(
      gate("/dashboard@evil.example.com", PROVISIONING),
      ONBOARDING_PATH,
    );
    assert.equal(gate("/dashboard\\evil", PROVISIONING), ONBOARDING_PATH);
  });

  it("lets the development design preview render while provisioning", () => {
    assert.equal(gate("/dashboard/design", PROVISIONING, true), null);
    assert.equal(gate("/dashboard/design/home", PROVISIONING, true), null);
    assert.equal(
      gate("/dashboard/design/home?state=empty", PROVISIONING, true),
      null,
    );
  });

  it("gates the design preview outside development", () => {
    assert.equal(
      gate("/dashboard/design", PROVISIONING, false),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard%2Fdesign`,
    );
  });

  it("does not let a design-look-alike path slip past the gate", () => {
    assert.equal(
      gate("/dashboard/designs", PROVISIONING, true),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard%2Fdesigns`,
    );
    assert.equal(
      gate("/dashboard/design-system", PROVISIONING, true),
      `${ONBOARDING_PATH}?redirect_url=%2Fdashboard%2Fdesign-system`,
    );
  });
});
