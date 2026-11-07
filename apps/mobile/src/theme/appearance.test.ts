import { describe, expect, it } from "vitest";

import { isAppearance, resolveColorScheme } from "./appearance";

describe("resolveColorScheme", () => {
  it("follows the phone when the User matches it", () => {
    expect(resolveColorScheme("system", "dark")).toBe("dark");
    expect(resolveColorScheme("system", "light")).toBe("light");
  });

  it("falls back to light when the phone does not say", () => {
    expect(resolveColorScheme("system", null)).toBe("light");
    expect(resolveColorScheme("system", "unspecified")).toBe("light");
  });

  it("keeps an explicit choice whatever the phone says", () => {
    expect(resolveColorScheme("light", "dark")).toBe("light");
    expect(resolveColorScheme("dark", "light")).toBe("dark");
  });
});

describe("isAppearance", () => {
  it("accepts the three choices and nothing else", () => {
    expect(isAppearance("system")).toBe(true);
    expect(isAppearance("dark")).toBe(true);
    expect(isAppearance("auto")).toBe(false);
    expect(isAppearance(null)).toBe(false);
  });
});
