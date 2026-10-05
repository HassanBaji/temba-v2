import { describe, expect, it } from "vitest";

import { isNearEnd } from "./scroll-end";

describe("isNearEnd", () => {
  it("is false while far from the bottom", () => {
    expect(
      isNearEnd({ contentOffsetY: 0, layoutHeight: 800, contentHeight: 3000 }),
    ).toBe(false);
  });

  it("is true within the distance of the bottom", () => {
    expect(
      isNearEnd({
        contentOffsetY: 2000,
        layoutHeight: 800,
        contentHeight: 3000,
      }),
    ).toBe(true);
  });

  it("is true when the content is shorter than the screen", () => {
    expect(
      isNearEnd({ contentOffsetY: 0, layoutHeight: 800, contentHeight: 400 }),
    ).toBe(true);
  });
});
