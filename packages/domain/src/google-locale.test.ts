import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { withGoogleLocale } from "./google-locale";

describe("withGoogleLocale", () => {
  const authorize =
    "https://accounts.google.com/o/oauth2/v2/auth?client_id=abc&scope=openid%20email";

  it("asks Google for Arabic when the customer reads Arabic", () => {
    const url = new URL(withGoogleLocale(authorize, "ar"));
    assert.equal(url.searchParams.get("hl"), "ar");
    assert.equal(url.searchParams.get("client_id"), "abc");
    assert.equal(url.searchParams.get("scope"), "openid email");
  });

  it("leaves the URL untouched in English", () => {
    assert.equal(withGoogleLocale(authorize, "en"), authorize);
  });

  it("replaces a language Google was already given", () => {
    const url = new URL(withGoogleLocale(`${authorize}&hl=en`, "ar"));
    assert.deepEqual(url.searchParams.getAll("hl"), ["ar"]);
  });
});
