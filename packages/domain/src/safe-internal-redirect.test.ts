import { describe, expect, it } from "vitest";

import { safeInternalRedirect } from "./safe-internal-redirect";

describe("safeInternalRedirect", () => {
  it.each([
    "/dashboard",
    "/invite/g/ABCD2345",
    "/dashboard/games/123?tab=players&sort=asc",
    "/onboarding?redirect_url=%2Fdashboard",
    "/search?q=padel%20night#results",
  ])("keeps the internal path %j", (value) => {
    expect(safeInternalRedirect(value)).toBe(value);
  });

  it.each([null, undefined, ""])("returns null for %j", (value) => {
    expect(safeInternalRedirect(value)).toBeNull();
  });

  it.each([
    "https://evil.example/",
    "evil.example",
    "javascript:alert(1)",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "/\\/evil.example",
    "\\\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "/\u0000/evil.example",
    "/\u001f/evil.example",
    "/\u007f/evil.example",
    "/dashboard\n",
    "/@evil.example",
    "/login@evil.example",
    "/%2F/evil.example",
    "/%2f%2fevil.example",
    "/%5C/evil.example",
    "/%5c%5cevil.example",
    "/%09/evil.example",
    "/%0A/evil.example",
    "/%0d/evil.example",
    "/%00/evil.example",
    "/%E0%A4%A",
  ])("rejects %j", (value) => {
    expect(safeInternalRedirect(value)).toBeNull();
  });

  it("never lets an accepted value resolve to another origin", () => {
    const base = "https://temba.example";
    for (const value of [
      "/dashboard?next=/games",
      "/a/b/../c",
      "/./dashboard",
    ]) {
      const kept = safeInternalRedirect(value);
      expect(kept).toBe(value);
      expect(new URL(kept!, base).origin).toBe(base);
    }
  });
});
