import { describe, expect, it } from "vitest";

import { resolveApiOrigin } from "./api-origin";

describe("resolveApiOrigin", () => {
  it("uses the Expo dev server host on the API port", () => {
    expect(resolveApiOrigin({ devServerHostUri: "192.168.1.20:8081" })).toBe(
      "http://192.168.1.20:4000",
    );
  });

  it("prefers an explicit origin and drops trailing slashes", () => {
    expect(
      resolveApiOrigin({
        override: "https://api.example.com/",
        devServerHostUri: "192.168.1.20:8081",
      }),
    ).toBe("https://api.example.com");
  });

  it("ignores a blank override", () => {
    expect(
      resolveApiOrigin({ override: "  ", devServerHostUri: "10.0.0.5:8081" }),
    ).toBe("http://10.0.0.5:4000");
  });

  it("throws when neither is available", () => {
    expect(() => resolveApiOrigin({})).toThrow(/EXPO_PUBLIC_API_ORIGIN/);
  });
});
