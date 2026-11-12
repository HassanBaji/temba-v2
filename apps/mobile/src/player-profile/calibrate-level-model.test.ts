import { describe, expect, it } from "vitest";

import {
  calibrateLevelLabel,
  calibrateLevelUnchanged,
  calibrateLevelView,
} from "./calibrate-level-model";

describe("calibrateLevelView", () => {
  it("starts football in whole OVR from the player's Level", () => {
    const view = calibrateLevelView(
      {
        name: "Sara K",
        sport: "football",
        rating: { level: "3.6", levelValue: 3.6, provisional: false },
      },
      "en",
    );
    expect(view.face).toBe("ovr");
    expect(view.currentValue).toBe(70);
    expect(view.wasLabel).toBe(`was ${calibrateLevelLabel("ovr", 70)}`);
    expect(calibrateLevelUnchanged(view, 70)).toBe(true);
    expect(calibrateLevelUnchanged(view, 71)).toBe(false);
  });

  it("starts padel in tenths, and a player with no Level from the default", () => {
    const view = calibrateLevelView(
      { name: "Sara K", sport: "padel", rating: null },
      "en",
    );
    expect(view.face).toBe("level");
    expect(view.currentValue).toBe(30);
    expect(view.wasLabel).toBe("no Level yet");
    expect(calibrateLevelUnchanged(view, 30)).toBe(false);
  });

  it("says a Provisional player stops being Provisional", () => {
    const view = calibrateLevelView(
      {
        name: "Sara K",
        sport: "padel",
        rating: { level: "3.2", levelValue: 3.2, provisional: true },
      },
      "en",
    );
    expect(view.currentValue).toBe(32);
    expect(view.note).toContain("Sara will no longer be Provisional");
  });
});
