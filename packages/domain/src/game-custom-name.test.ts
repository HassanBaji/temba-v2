import { describe, expect, it } from "vitest";

import { gameCustomName, gameWindowLabel } from "./game-custom-name";
import { formatGameWindowName, splitGameWindow } from "./game-window";

describe("gameCustomName", () => {
  it("returns the name only when the Organizer chose it", () => {
    expect(gameCustomName({ name: "Smash", hasCustomName: true })).toBe(
      "Smash",
    );
    expect(
      gameCustomName({ name: "Thu 8:00 PM - 9:30 PM", hasCustomName: false }),
    ).toBeNull();
    expect(gameCustomName({ name: "  ", hasCustomName: true })).toBeNull();
  });
});

describe("gameWindowLabel", () => {
  it("matches the label the create flow writes", () => {
    const windowStart = new Date("2026-11-05T17:00:00.000Z");
    const windowEnd = new Date("2026-11-05T18:30:00.000Z");
    const window = splitGameWindow(windowStart, windowEnd);
    expect(gameWindowLabel(windowStart, windowEnd)).toBe(
      formatGameWindowName(window.day, window.startTime, window.finishTime),
    );
  });

  it("is null without a window", () => {
    expect(gameWindowLabel(null, null)).toBeNull();
  });
});
