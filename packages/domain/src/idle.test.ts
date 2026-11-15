import { describe, expect, it } from "vitest";

import { IDLE_PERIOD_MS, youRatingViewAfterIdle } from "./idle";

const now = new Date("2026-11-12T12:00:00Z");
const longIdle = new Date(now.getTime() - 12 * IDLE_PERIOD_MS);

function row(sport: string) {
  return {
    sport,
    mu: 1500,
    phi: 199,
    sigma: 0.06,
    levelBand: "C2" as const,
    lastRatedAt: longIdle,
  };
}

describe("youRatingViewAfterIdle", () => {
  it("lets a padel Rating drift back to Provisional after a long idle spell", () => {
    expect(youRatingViewAfterIdle(row("padel"), now).provisional).toBe(true);
  });

  it("never inflates a football Rating, whose φ only carries Provisional", () => {
    const view = youRatingViewAfterIdle(row("football"), now);
    expect(view.provisional).toBe(false);
    expect(view.ratedMatchesRemaining).toBe(0);
  });
});
