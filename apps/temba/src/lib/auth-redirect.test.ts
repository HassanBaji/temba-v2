import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  authCompleteUrl,
  authCrossLinkUrl,
  ssoCallbackUrl,
} from "./auth-redirect";

describe("authCrossLinkUrl", () => {
  it("returns the bare target when redirectUrl is null", () => {
    assert.equal(authCrossLinkUrl("/", null), "/");
    assert.equal(authCrossLinkUrl("/login", null), "/login");
    assert.equal(authCrossLinkUrl("/signup", null), "/signup");
  });

  it("appends an encoded redirect_url query when a value is present", () => {
    assert.equal(
      authCrossLinkUrl("/signup", "/dashboard/games/x"),
      "/signup?redirect_url=%2Fdashboard%2Fgames%2Fx",
    );
    assert.equal(
      authCrossLinkUrl("/login", "/dashboard/games/x"),
      "/login?redirect_url=%2Fdashboard%2Fgames%2Fx",
    );
    assert.equal(
      authCrossLinkUrl("/", "/onboarding"),
      "/?redirect_url=%2Fonboarding",
    );
  });

  it("never produces a redirect_url= param for null", () => {
    assert.equal(
      authCrossLinkUrl("/login", null).includes("redirect_url="),
      false,
    );
  });
});

describe("authCompleteUrl", () => {
  it("returns the given path when present", () => {
    assert.equal(authCompleteUrl("/dashboard/games/x"), "/dashboard/games/x");
  });

  it("falls back to /dashboard when redirectUrl is null", () => {
    assert.equal(authCompleteUrl(null), "/dashboard");
  });
});

describe("ssoCallbackUrl", () => {
  it("builds the callback path without a query when redirectUrl is null", () => {
    assert.equal(ssoCallbackUrl("/login", null), "/login/sso-callback");
    assert.equal(ssoCallbackUrl("/signup", null), "/signup/sso-callback");
  });

  it("threads redirect_url through the callback path", () => {
    assert.equal(
      ssoCallbackUrl("/login", "/dashboard/games/x"),
      "/login/sso-callback?redirect_url=%2Fdashboard%2Fgames%2Fx",
    );
    assert.equal(
      ssoCallbackUrl("/signup", "/dashboard/you"),
      "/signup/sso-callback?redirect_url=%2Fdashboard%2Fyou",
    );
  });

  it("never produces a redirect_url= param for null", () => {
    assert.equal(
      ssoCallbackUrl("/login", null).includes("redirect_url="),
      false,
    );
  });
});
