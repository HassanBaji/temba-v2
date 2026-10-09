import { describe, expect, it } from "vitest";

import { fontFamilyFor } from "./font-family";

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
});
