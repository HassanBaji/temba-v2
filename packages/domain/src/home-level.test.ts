import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeLevelView } from "./home-level";

const base = {
  band: "C2",
  level: "3.4",
  provisional: true,
  ratedMatchesRemaining: 4,
  history: ["3.1", "3.2", "3.4"],
  progressPercent: 16,
} as const;

describe("homeLevelView", () => {
  it("shows the collapsed display letter, never the stored band", () => {
    assert.equal(homeLevelView(base).displayBand, "C");
    assert.equal(homeLevelView({ ...base, band: "C1" }).displayBand, "C+");
  });

  it("reads the change over the rated Matches in the window", () => {
    assert.deepEqual(homeLevelView(base).change, {
      direction: "up",
      amount: "0.3",
      spoken: "Up",
      windowLabel: "last 2 matches",
    });
    assert.equal(
      homeLevelView({ ...base, history: ["3.1", "3.2"] }).change?.windowLabel,
      "last 1 match",
    );
  });

  it("has no change line without a rated Match in the history", () => {
    assert.equal(homeLevelView({ ...base, history: ["3.4"] }).change, null);
    assert.equal(homeLevelView({ ...base, history: [] }).change, null);
  });

  it("clamps and words the progress toward the next rung", () => {
    assert.deepEqual(homeLevelView(base).progress, {
      percent: 16,
      label: "16% of the way to C+",
    });
    assert.equal(
      homeLevelView({ ...base, progressPercent: 140 }).progress?.percent,
      100,
    );
    assert.equal(
      homeLevelView({ ...base, progressPercent: null }).progress?.percent,
      0,
    );
  });

  it("drops the progress track at the top band", () => {
    assert.equal(homeLevelView({ ...base, band: "A" }).progress, null);
  });

  it("explains Provisional and confirmed Levels", () => {
    const provisional = homeLevelView(base).legend;
    assert.equal(provisional.lead, "Provisional Level.");
    assert.match(provisional.rest, /about 4 more rated games/);
    assert.match(
      homeLevelView({ ...base, ratedMatchesRemaining: 1 }).legend.rest,
      /1 more rated game and/,
    );
    assert.equal(
      homeLevelView({ ...base, provisional: false }).legend.lead,
      "Level confirmed.",
    );
  });
});
