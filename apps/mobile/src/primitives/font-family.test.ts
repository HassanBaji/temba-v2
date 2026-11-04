import { describe, expect, it } from "vitest";

import { containsArabic, fontFamilyFor } from "./font-family";

describe("fontFamilyFor", () => {
  it.each([
    ["regular", "Archivo-Regular"],
    ["medium", "Archivo-Medium"],
    ["semibold", "Archivo-SemiBold"],
    ["bold", "Archivo-Bold"],
  ] as const)("maps the %s weight to %s", (weight, family) => {
    expect(fontFamilyFor({ weight, width: "normal", mono: false })).toBe(
      family,
    );
  });

  it("uses the only expanded cut whatever the weight", () => {
    expect(
      fontFamilyFor({ weight: "regular", width: "expanded", mono: false }),
    ).toBe("ArchivoExpanded-Bold");
  });

  it("uses Geist Mono for micro-labels", () => {
    expect(
      fontFamilyFor({ weight: "bold", width: "expanded", mono: true }),
    ).toBe("GeistMono-Regular");
  });

  it("keeps the body family for Arabic micro-labels", () => {
    expect(
      fontFamilyFor({
        weight: "medium",
        width: "normal",
        mono: true,
        arabic: true,
      }),
    ).toBe("Archivo-Medium");
    expect(
      fontFamilyFor({
        weight: "bold",
        width: "expanded",
        mono: true,
        arabic: true,
      }),
    ).toBe("Archivo-Bold");
  });

  it("keeps Geist Mono for Latin and numeric micro-labels", () => {
    expect(
      fontFamilyFor({
        weight: "regular",
        width: "normal",
        mono: true,
        arabic: false,
      }),
    ).toBe("GeistMono-Regular");
  });
});

describe("containsArabic", () => {
  it.each([
    ["الخطوة 1 من 4", true],
    ["بادل", true],
    ["\u0750", true],
    ["\u08A0", true],
    ["1080 × 1920 · STORY", false],
    ["STEP 1 OF 4", false],
    ["", false],
  ])("reads %j as Arabic: %s", (text, expected) => {
    expect(containsArabic(text)).toBe(expected);
  });

  it("looks inside arrays and nested elements", () => {
    expect(containsArabic(["Padel", " · ", 4])).toBe(false);
    expect(containsArabic(["Padel", " · ", "ملاعب"])).toBe(true);
    expect(containsArabic({ props: { children: ["4 ", "ملاعب"] } })).toBe(true);
  });

  it("ignores numbers, null and booleans", () => {
    expect(containsArabic(1080)).toBe(false);
    expect(containsArabic(null)).toBe(false);
    expect(containsArabic(false)).toBe(false);
  });
});
