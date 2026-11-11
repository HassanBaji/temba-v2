import { describe, expect, it } from "vitest";

import { ovrFromLevel } from "./football-ovr";
import { BAND_MIDPOINTS } from "./level";

describe("ovrFromLevel", () => {
  it("maps the Level scale onto 40 to 99", () => {
    expect(ovrFromLevel(0)).toBe(40);
    expect(ovrFromLevel(7)).toBe(99);
  });

  it("reads the self-placed football bands as Beginner 43, Casual 61, Competitive 72, Pro 78", () => {
    expect(
      [
        BAND_MIDPOINTS.D3,
        BAND_MIDPOINTS.C3,
        BAND_MIDPOINTS.C1,
        BAND_MIDPOINTS.B3,
      ].map((level) => Math.round(ovrFromLevel(level))),
    ).toEqual([43, 61, 72, 78]);
  });
});
