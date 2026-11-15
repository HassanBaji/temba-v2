import { describe, expect, it } from "vitest";

import { fishGlyphs, fishSizes } from "./fish.ts";

describe("fishGlyphs", () => {
  it("keeps every viewBox at the five by three the sizes use", () => {
    for (const glyph of Object.values(fishGlyphs)) {
      const [, , width, height] = glyph.viewBox.split(" ").map(Number);
      expect(width! / height!).toBeCloseTo(5 / 3, 10);
    }
    for (const size of Object.values(fishSizes)) {
      expect(size.width / size.height).toBeCloseTo(5 / 3, 10);
    }
  });

  it("draws each body as one closed path", () => {
    for (const glyph of Object.values(fishGlyphs)) {
      expect(glyph.body.startsWith("M")).toBe(true);
      expect(glyph.body.trimEnd().endsWith("Z")).toBe(true);
    }
  });
});
