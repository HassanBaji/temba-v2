import { describe, expect, it } from "vitest";

import { REMOTE_PATHS, remotePathRewrites } from "./remote-paths";

describe("remotePathRewrites", () => {
  it("sends media and the Clerk webhook to the API at the same path", () => {
    expect(REMOTE_PATHS).toEqual(["/api/media/:path*", "/api/webhooks"]);
    expect(remotePathRewrites("https://api.example.com")).toEqual([
      {
        source: "/api/media/:path*",
        destination: "https://api.example.com/api/media/:path*",
      },
      {
        source: "/api/webhooks",
        destination: "https://api.example.com/api/webhooks",
      },
    ]);
  });

  it("rewrites nothing without an API origin or without paths", () => {
    expect(remotePathRewrites(undefined)).toEqual([]);
    expect(remotePathRewrites("https://api.example.com", [])).toEqual([]);
  });
});
