import { describe, expect, it } from "vitest";

import { surfaceToneForPhase } from "./surface-tone";

describe("surfaceToneForPhase", () => {
  it("is paper once the game is final", () => {
    expect(surfaceToneForPhase("final")).toBe("paper");
  });

  it.each(["upcoming", "ongoing", "needs_results", "cancelled"] as const)(
    "is ink while the game is %s",
    (phase) => {
      expect(surfaceToneForPhase(phase)).toBe("ink");
    },
  );
});
