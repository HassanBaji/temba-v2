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
    const view = profileAllTimeView(
      { ...base, matchesPlayed: 6, matchesWon: 3, matchesLost: 2 },
      "en",
    );
    assert.equal(view.winRatePercent, 50);
    assert.equal(view.winRateNote, null);
  });

  it("hides the win rate under five matches and says when it appears", () => {
    const view = profileAllTimeView(base, "en");
    assert.equal(view.winRatePercent, null);
    assert.equal(view.winRateNote, "Win rate shows after 5 matches");
    assert.equal(
      profileAllTimeView(base, "ar").winRateNote,
      "تظهر نسبة الفوز بعد 5 مباريات",
    );
  });

  it("formats record, sets, streak, partner and since", () => {
    const view = profileAllTimeView(base, "en");
    assert.equal(view.record, "2 won, 1 lost");
    assert.equal(view.sets, "5 won, 3 lost");
    assert.deepEqual(view.tally, { label: "Sets", value: "5 won, 3 lost" });
    assert.equal(view.longestStreak, "2 wins");
    assert.equal(view.partnerLabel, "Most played partner");
    assert.equal(view.mostPlayedPartner, "Sam C");
    assert.equal(view.sinceLabel, "Since 2024");
  });

  it("tallies goals and names a teammate for football", () => {
    const view = profileAllTimeView(
      {
        ...base,
        sport: "football",
        goalsScored: 7,
      },
      "en",
    );
    assert.deepEqual(view.tally, { label: "Goals", value: "7" });
    assert.equal(view.partnerLabel, "Most played teammate");
  });

  it("reads football goals as empty before a match", () => {
    const view = profileAllTimeView(
      {
        ...base,
        sport: "football",
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        goalsScored: 0,
      },
      "en",
    );
    assert.deepEqual(view.tally, { label: "Goals", value: "—" });
  });

  it("reads as empty for a User with no matches", () => {
    const view = profileAllTimeView(
      {
        ...base,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        setsWon: 0,
        setsLost: 0,
        longestWinStreak: 0,
        mostPlayedPartnerName: null,
        firstMatchAt: null,
      },
      "en",
    );
    assert.equal(view.winRatePercent, null);
    assert.equal(view.sets, "—");
    assert.equal(view.longestStreak, "—");
    assert.equal(view.mostPlayedPartner, "—");
    assert.equal(view.sinceLabel, null);
  });
});

describe("winStreakLabel", () => {
  it("singularises one win", () => {
    assert.equal(winStreakLabel(1, "en"), "1 win");
  });
});

describe("matchYear and playingSinceLine", () => {
  it("returns null for missing or invalid dates", () => {
    assert.equal(matchYear(null), null);
    assert.equal(matchYear("not a date"), null);
    assert.equal(playingSinceLine(null, "en"), null);
  });

  it("reads the all-time card in Arabic", () => {
    const view = profileAllTimeView(base, "ar");
    assert.equal(view.record, "2 فوز، 1 خسارة");
    assert.equal(view.sets, "5 فوز، 3 خسارة");
    assert.equal(view.longestStreak, "فوزان");
    assert.equal(view.partnerLabel, "الشريك الأكثر لعبًا معه");
    assert.equal(view.sinceLabel, "منذ 2024");
    assert.equal(
      playingSinceLine(new Date(2023, 2, 1), "ar"),
      "يلعب البادل منذ 2023",
    );
  });

  it("names the year of the first match", () => {
    assert.equal(
      playingSinceLine(new Date(2023, 2, 1), "en"),
      "Playing padel since 2023",
    );
  });
});
