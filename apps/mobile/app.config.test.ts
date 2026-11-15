import { describe, expect, it } from "vitest";

import { releaseApiOriginProblem } from "./app.config";

describe("releaseApiOriginProblem", () => {
  it("allows a local start or a development build without an origin", () => {
    expect(releaseApiOriginProblem({})).toBeNull();
    expect(
      releaseApiOriginProblem({ EAS_BUILD_PROFILE: "development" }),
    ).toBeNull();
  });

  it("refuses a preview or production build without an origin", () => {
    expect(releaseApiOriginProblem({ EAS_BUILD_PROFILE: "preview" })).toMatch(
      /EXPO_PUBLIC_API_ORIGIN/,
    );
    expect(
      releaseApiOriginProblem({
        EAS_BUILD_PROFILE: "production",
        EXPO_PUBLIC_API_ORIGIN: "  ",
      }),
    ).toMatch(/production/);
  });

  it("refuses a plain http origin or a path in a release build", () => {
    expect(
      releaseApiOriginProblem({
        EAS_BUILD_PROFILE: "production",
        EXPO_PUBLIC_API_ORIGIN: "http://api.temba.app",
      }),
    ).toMatch(/https/);
    expect(
      releaseApiOriginProblem({
        EAS_BUILD_PROFILE: "production",
        EXPO_PUBLIC_API_ORIGIN: "https://api.temba.app/api/trpc",
      }),
    ).toMatch(/https/);
  });

  it("accepts an https origin", () => {
    expect(
      releaseApiOriginProblem({
        EAS_BUILD_PROFILE: "production",
        EXPO_PUBLIC_API_ORIGIN: "https://api.temba.app/",
      }),
    ).toBeNull();
  });
});
