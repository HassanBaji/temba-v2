import { describe, expect, it } from "vitest";

import {
  gameCustomName,
  gameDisplayName,
  gameWindowLabel,
} from "./game-custom-name";
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
    expect(gameWindowLabel(windowStart, windowEnd, "en")).toBe(
      formatGameWindowName(
        window.day,
        window.startTime,
        window.finishTime,
        "en",
      ),
    );
    expect(gameWindowLabel(windowStart, windowEnd, "ar")).toBe(
      formatGameWindowName(
        window.day,
        window.startTime,
        window.finishTime,
        "ar",
      ),
    );
  });

  it("is null without a window", () => {
    expect(gameWindowLabel(null, null, "en")).toBeNull();
  });
});

describe("gameDisplayName", () => {
  const windowStart = new Date("2026-11-04T07:30:00.000Z");
  const windowEnd = new Date("2026-11-04T09:00:00.000Z");

  it("shows the custom name in every locale", () => {
    const game = {
      name: "Thursday seven-a-side",
      hasCustomName: true,
      format: "friendly_game",
      windowStart,
      windowEnd,
    };
    expect(gameDisplayName(game, "en")).toBe("Thursday seven-a-side");
    expect(gameDisplayName(game, "ar")).toBe("Thursday seven-a-side");
  });

  it("rebuilds the window label in the viewer's locale", () => {
    const game = {
      name: "Wed 10:30 AM - 12:00 PM",
      hasCustomName: false,
      format: "friendly_game",
      windowStart,
      windowEnd,
    };
    expect(gameDisplayName(game, "en")).toBe("Wed 10:30 AM - 12:00 PM");
    expect(gameDisplayName(game, "ar")).toBe("الأربعاء، 10:30 ص – 12:00 م");
  });

  it("keeps a tournament's stored name", () => {
    const game = {
      name: "Summer Cup",
      hasCustomName: false,
      format: "friendly_tournament",
      windowStart,
      windowEnd,
    };
    expect(gameDisplayName(game, "ar")).toBe("Summer Cup");
  });

  it("falls back to the stored name, then to the catalog", () => {
    const noWindow = {
      format: "friendly_game",
      windowStart: null,
      windowEnd: null,
    };
    expect(
      gameDisplayName({ ...noWindow, name: "Wed 10:30 AM - 12:00 PM" }, "ar"),
    ).toBe("Wed 10:30 AM - 12:00 PM");
    expect(gameDisplayName({ ...noWindow, name: null }, "en")).toBe("Game");
    expect(gameDisplayName({ ...noWindow, name: null }, "ar")).toBe("مباراة");
  });
});
