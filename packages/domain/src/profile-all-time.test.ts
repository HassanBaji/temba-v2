import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  matchYear,
  playingSinceLine,
  profileAllTimeView,
  winStreakLabel,
} from "./profile-all-time";

const base = {
  matchesPlayed: 4,
  matchesWon: 2,
  matchesLost: 1,
  setsWon: 5,
  setsLost: 3,
  longestWinStreak: 2,
  mostPlayedPartnerName: "Sam Carter",
  firstMatchAt: new Date(2024, 5, 1),
};

describe("profileAllTimeView", () => {
  it("divides won by played, so a draw counts as played", () => {
    assert.equal(profileAllTimeView(base).winRatePercent, 50);
  });

  it("formats record, sets, streak, partner and since", () => {
    const view = profileAllTimeView(base);
    assert.equal(view.record, "2–1");
    assert.equal(view.sets, "5–3");
    assert.equal(view.longestStreak, "2 wins");
    assert.equal(view.mostPlayedPartner, "Sam C");
    assert.equal(view.sinceLabel, "Since 2024");
  });

  it("reads as empty for a User with no matches", () => {
    const view = profileAllTimeView({
      ...base,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      setsWon: 0,
      setsLost: 0,
      longestWinStreak: 0,
      mostPlayedPartnerName: null,
      firstMatchAt: null,
    });
    assert.equal(view.winRatePercent, null);
    assert.equal(view.sets, "—");
    assert.equal(view.longestStreak, "—");
    assert.equal(view.mostPlayedPartner, "—");
    assert.equal(view.sinceLabel, null);
  });
});

describe("winStreakLabel", () => {
  it("singularises one win", () => {
    assert.equal(winStreakLabel(1), "1 win");
  });
});

describe("matchYear and playingSinceLine", () => {
  it("returns null for missing or invalid dates", () => {
    assert.equal(matchYear(null), null);
    assert.equal(matchYear("not a date"), null);
    assert.equal(playingSinceLine(null), null);
  });

  it("names the year of the first match", () => {
    assert.equal(
      playingSinceLine(new Date(2023, 2, 1)),
      "Playing padel since 2023",
    );
  });
});
