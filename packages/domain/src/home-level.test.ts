import assert from "node:assert/strict";
import { isolate } from "@repo/i18n/bidi";
import { describe, it } from "vitest";

import { levelFromOvr, muFromOvr } from "./football-ovr";
import { homeLevelView, type HomeLevelInput } from "./home-level";
import { ratingsLevelView } from "./ratings-screen";

const football: HomeLevelInput = {
  sport: "football",
  face: "ovr",
  levelValue: levelFromOvr(74),
  rating: { levelBand: "C1", provisional: false, ratedMatchesRemaining: 0 },
  ratedMatchCount: 12,
  changeOverLast: { matches: 8, delta: 2.2, points: [72, 72.6, 74.2] },
  history: ["72", "73", "74"],
  historySteps: ["won", "won"],
  historyMatchCount: 2,
  lastMatch: {
    outcome: "won",
    sets: [{ own: 5, opponent: 3 }],
    muBefore: muFromOvr(73),
    muAfter: muFromOvr(74),
  },
};

const padel: HomeLevelInput = {
  sport: "padel",
  face: "level",
  levelValue: 3.449,
  rating: { levelBand: "C2", provisional: true, ratedMatchesRemaining: 3 },
  ratedMatchCount: 2,
  changeOverLast: { matches: 2, delta: -0.15, points: [3.6, 3.5, 3.45] },
  history: ["3.60", "3.50", "3.45"],
  historySteps: ["lost", "lost"],
  historyMatchCount: 2,
};

describe("homeLevelView", () => {
  it("reads a football Level as the number alone: Level 74 on the 40 to 99 scale, +2 over the last 8", () => {
    const view = homeLevelView(football, "en");
    assert.ok(view);
    assert.equal(view.numberLabel, "Level");
    assert.equal(view.level, "74");
    assert.equal(view.displayBand, null);
    assert.deepEqual(view.scale, {
      percent: 57.6,
      ticks: ["40", "55", "70", "85", "99"],
    });
    assert.equal(view.status, "Confirmed");
    assert.deepEqual(view.change, {
      signedAmount: isolate("+2"),
      caption: "last 8",
      points: [72, 72.6, 74.2],
    });
    assert.equal(view.start, null);
    assert.equal(view.footer.label, "Last match");
    assert.equal(view.footer.result, "Won 5–3");
    assert.equal(view.footer.value, "+1");
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
    assert.equal(view.scale, null);
    assert.equal(view.provisional, true);
    assert.equal(view.status, "Provisional");
    assert.equal(view.change?.signedAmount, isolate("−0.15"));
    assert.deepEqual(view.footer, {
      label: "To confirm",
      value: "2 of 5 matches",
      detail: null,
      result: null,
      pips: null,
    });
    assert.equal(view.percent, 40);
  });

  it("has no change line before a counting Match, and says where the number came from", () => {
    const view = homeLevelView(
      { ...football, changeOverLast: null, historySteps: [] },
      "en",
    );
    assert.equal(view?.change, null);
    assert.equal(view?.start, "Starting level, from sign-up");
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
