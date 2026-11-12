import assert from "node:assert/strict";
import { isolate } from "@repo/i18n/bidi";
import { describe, it } from "vitest";

import { homeLevelView } from "./home-level";

const base = {
  band: "C2",
  level: "3.4",
  provisional: true,
  ratedMatchesRemaining: 4,
  history: ["3.1", "3.2", "3.4"],
  historyMatchCount: 2,
  progressPercent: 16,
} as const;

describe("homeLevelView", () => {
  it("shows the collapsed display letter, never the stored band", () => {
    assert.equal(homeLevelView(base, "en").displayBand, "C");
    assert.equal(
      homeLevelView({ ...base, band: "C1" }, "en").displayBand,
      "C+",
    );
  });

  it("reads the change over the rated Matches in the window", () => {
    assert.deepEqual(homeLevelView(base, "en").change, {
      direction: "up",
      amount: "0.3",
      signedAmount: isolate("+0.3"),
      spoken: "Up",
      windowLabel: "in the last 2 matches",
    });
    assert.equal(
      homeLevelView(
        { ...base, history: ["3.1", "3.2"], historyMatchCount: 1 },
        "en",
      ).change?.windowLabel,
      "in the last match",
    );
  });

  it("counts Rated Matches only, not Level sets, in the window", () => {
    const view = homeLevelView(
      { ...base, history: ["3.2", "2.9", "2.8"], historyMatchCount: 2 },
      "ar",
    );
    assert.equal(view.change?.signedAmount, isolate("\u22120.4"));
    assert.equal(view.change?.windowLabel, "في آخر مباراتين");
    assert.equal(
      homeLevelView(
        { ...base, history: ["3.1", "4.0", "4.2"], historyMatchCount: 1 },
        "en",
      ).change?.windowLabel,
      "in the last match",
    );
  });

  it("has no change line without a rated Match in the history", () => {
    assert.equal(
      homeLevelView({ ...base, history: ["3.4"], historyMatchCount: 0 }, "en")
        .change,
      null,
    );
    assert.equal(
      homeLevelView(
        { ...base, history: ["3.1", "4.0"], historyMatchCount: 0 },
        "en",
      ).change,
      null,
    );
    assert.equal(homeLevelView({ ...base, history: [] }, "en").change, null);
  });

  it("clamps and words the progress toward the next rung", () => {
    assert.deepEqual(homeLevelView(base, "en").progress, {
      percent: 16,
      label: "16% of the way to C+",
    });
    assert.equal(
      homeLevelView({ ...base, progressPercent: 140 }, "en").progress?.percent,
      100,
    );
    assert.equal(
      homeLevelView({ ...base, progressPercent: null }, "en").progress?.percent,
      0,
    );
  });

  it("drops the progress track at the top band", () => {
    assert.equal(homeLevelView({ ...base, band: "A" }, "en").progress, null);
  });

  it("explains Provisional and confirmed Levels", () => {
    const provisional = homeLevelView(base, "en").legend;
    assert.equal(provisional.lead, "Provisional Level.");
    assert.match(provisional.rest, /about 4 more rated games/);
    assert.match(
      homeLevelView({ ...base, ratedMatchesRemaining: 1 }, "en").legend.rest,
      /1 more rated game and/,
    );
    assert.equal(
      homeLevelView({ ...base, provisional: false }, "en").legend.lead,
      "Level confirmed.",
    );
  });

  it("reads the Level card in Arabic", () => {
    const view = homeLevelView(base, "ar");
    assert.equal(view.legend.lead, "مستواك مبدئي.");
    assert.equal(view.legend.rest, " العب 4 مباريات مصنّفة أخرى لتأكيده.");
    assert.equal(view.change?.windowLabel, "في آخر مباراتين");
    assert.equal(view.progress?.label, `16% نحو ${isolate("C+")}`);
  });

  it("reads a football Level as OVR: 74 is band C+ on its way to B−", () => {
    const view = homeLevelView(
      {
        sport: "football",
        ovr: 74,
        band: "C1",
        level: "4.0",
        provisional: false,
        ratedMatchesRemaining: 0,
        history: ["72", "73", "74"],
        historyMatchCount: 2,
        progressPercent: 76,
      },
      "en",
    );
    assert.equal(view.numberLabel, "OVR");
    assert.equal(view.level, "74");
    assert.equal(view.displayBand, "C+");
    assert.equal(view.progress?.label, "76% of the way to B-");
    assert.equal(view.change?.signedAmount, isolate("+2"));
  });

  it("reads a padel Level from 1.00 to 7.00 with two decimals", () => {
    assert.equal(
      homeLevelView({ ...base, levelValue: 3.449 }, "en").level,
      "3.45",
    );
    const floored = homeLevelView(
      { ...base, band: "D3", level: "0.4", levelValue: 0.35 },
      "en",
    );
    assert.equal(floored.level, "1.00");
    assert.equal(floored.displayBand, "D");
  });

  it("keeps a football Level as OVR when it has a continuous Level", () => {
    const view = homeLevelView(
      {
        ...base,
        sport: "football",
        ovr: 74,
        band: "C1",
        level: "4.0",
        levelValue: 4.02,
      },
      "en",
    );
    assert.equal(view.level, "74");
  });

  it("keeps the padel Level face", () => {
    const view = homeLevelView({ ...base, ovr: 61 }, "en");
    assert.equal(view.numberLabel, "Level");
    assert.equal(view.level, "3.4");
  });
});
