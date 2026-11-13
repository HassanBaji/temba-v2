import assert from "node:assert/strict";
import { isolate } from "@repo/i18n/bidi";
import { describe, it } from "vitest";

import { levelFromOvr } from "./football-ovr";
import { homeLevelView, type HomeLevelInput } from "./home-level";
import { ratingsLevelView } from "./ratings-screen";

const football: HomeLevelInput = {
  sport: "football",
  face: "ovr",
  levelValue: levelFromOvr(74),
  rating: { levelBand: "C1", provisional: false, ratedMatchesRemaining: 0 },
  ratedMatchCount: 12,
  changeOverLast: { matches: 8, delta: 2.2, points: [72, 72.6, 74.2] },
};

const padel: HomeLevelInput = {
  sport: "padel",
  face: "level",
  levelValue: 3.449,
  rating: { levelBand: "C2", provisional: true, ratedMatchesRemaining: 3 },
  ratedMatchCount: 2,
  changeOverLast: { matches: 2, delta: -0.15, points: [3.6, 3.5, 3.45] },
};

describe("homeLevelView", () => {
  it("reads a football Level as screen 1a: Level 74, band C+, +2 over the last 8", () => {
    const view = homeLevelView(football, "en");
    assert.ok(view);
    assert.equal(view.numberLabel, "Level");
    assert.equal(view.level, "74");
    assert.equal(view.displayBand, "C+");
    assert.equal(view.status, "Confirmed");
    assert.deepEqual(view.change, {
      signedAmount: isolate("+2"),
      caption: "last 8",
      points: [72, 72.6, 74.2],
    });
    assert.equal(view.footer.label, "Next band");
    assert.equal(view.footer.value, "B-");
  });

  it("says what the Ratings screen says", () => {
    const view = homeLevelView(football, "en");
    const ratings = ratingsLevelView(football, "football", "en");
    assert.ok(view);
    assert.equal(ratings.kind, "rated");
    if (ratings.kind !== "rated") return;
    assert.equal(view.level, ratings.number);
    assert.equal(view.percent, ratings.ringPercent);
    assert.deepEqual(view.footer, ratings.footer);
    assert.equal(view.spoken, ratings.spoken);
  });

  it("reads padel to two decimals, and a Provisional Level by the count to confirm", () => {
    const view = homeLevelView(padel, "en");
    assert.ok(view);
    assert.equal(view.level, "3.45");
    assert.equal(view.displayBand, "C");
    assert.equal(view.provisional, true);
    assert.equal(view.status, "Provisional");
    assert.equal(view.change?.signedAmount, isolate("−0.15"));
    assert.deepEqual(view.footer, {
      label: "To confirm",
      value: "2 of 5 matches",
      detail: null,
    });
    assert.equal(view.percent, 40);
  });

  it("has no change line before a counting Match", () => {
    const view = homeLevelView({ ...football, changeOverLast: null }, "en");
    assert.equal(view?.change, null);
  });

  it("has no Level before the first Rating", () => {
    assert.equal(
      homeLevelView({ ...football, rating: null, levelValue: null }, "en"),
      null,
    );
  });

  it("reads in Arabic", () => {
    const view = homeLevelView(football, "ar");
    assert.ok(view);
    assert.equal(view.numberLabel, "المستوى");
    assert.equal(view.status, "مؤكد");
    assert.equal(view.change?.caption, "آخر 8");
  });
});
