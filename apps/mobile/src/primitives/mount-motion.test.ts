import { describe, expect, it } from "vitest";

import { mountMotion } from "./mount-motion";

describe("mountMotion", () => {
  it("runs from empty to full over the duration", () => {
    expect(mountMotion({ reducedMotion: false, durationMs: 800 })).toEqual({
      from: 0,
      to: 1,
      durationMs: 800,
    });
  });

  it("starts at the final state with reduce-motion on", () => {
    expect(mountMotion({ reducedMotion: true, durationMs: 800 })).toEqual({
      from: 1,
      to: 1,
      durationMs: 0,
    });
  });
});
