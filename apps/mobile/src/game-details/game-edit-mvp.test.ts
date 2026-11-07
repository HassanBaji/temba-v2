import { describe, expect, it } from "vitest";

import { gameEditMvp, gameEditMvpChanged } from "./game-edit-mvp";

const completedAt = new Date("2026-11-05T19:00:00Z");
const openWindow = {
  state: "open" as const,
  opensAt: completedAt,
  closesAt: new Date("2026-11-07T19:00:00Z"),
};

describe("gameEditMvp", () => {
  it("has nothing to show until the marks load", () => {
    expect(gameEditMvp(undefined, "none")).toBeNull();
    expect(gameEditMvpChanged(null)).toBe(false);
  });

  it("lets the Organizer change the mode while the Match is not completed", () => {
    const marks = { window: null, mvp: { mode: "vote" as const } };
    expect(gameEditMvp(marks, null)).toEqual({
      saved: "vote",
      picked: "vote",
      editable: true,
    });
    expect(gameEditMvpChanged(gameEditMvp(marks, null))).toBe(false);
    expect(gameEditMvpChanged(gameEditMvp(marks, "vote"))).toBe(false);
    expect(gameEditMvpChanged(gameEditMvp(marks, "organizer"))).toBe(true);
  });

  it("shows the mode read-only once the score is confirmed", () => {
    const marks = { window: openWindow, mvp: { mode: "organizer" as const } };
    const mvp = gameEditMvp(marks, "none");
    expect(mvp?.editable).toBe(false);
    expect(gameEditMvpChanged(mvp)).toBe(false);
  });
});
