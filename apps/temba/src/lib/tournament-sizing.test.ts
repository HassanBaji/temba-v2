import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  ONE_DAY_OVERRUN_MESSAGE,
  balancedPoolSizes,
  courtCountValue,
  defaultPoolCount,
  formatMatchesPerTeam,
  formatPoolSizeLine,
  lastMatchFinishCopy,
  maxPoolCount,
  oneDayFit,
  playersInPairsLine,
  poolCountForDrawnField,
  sizeFriendlyTournament,
  TOURNAMENT_DEFAULT_POOL_COUNT,
  TOURNAMENT_DEFAULT_TEAM_COUNT,
  tournamentMatchMinutes,
  TOURNAMENT_TEAM_MAX,
  TOURNAMENT_TEAM_MIN,
} from "./tournament-sizing";

describe("sizeFriendlyTournament", () => {
  it("splits 10 Game teams into 3 uneven Pools", () => {
    const result = sizeFriendlyTournament(10, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.deepEqual(result.sizing.poolSizes, [4, 3, 3]);
    assert.equal(result.sizing.uneven, true);
    assert.equal(result.sizing.poolMatches, 12);
    assert.equal(result.sizing.matchesPerTeamMin, 2);
    assert.equal(result.sizing.matchesPerTeamMax, 3);
    assert.equal(result.sizing.roundCount, 3);
    assert.equal(result.sizing.playerCount, 20);
  });

  it("adds a bye Round when the largest Pool has an odd size", () => {
    const result = sizeFriendlyTournament(6, 2);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.deepEqual(result.sizing.poolSizes, [3, 3]);
    assert.equal(result.sizing.roundCount, 3);
    assert.equal(result.sizing.poolMatches, 6);
    assert.equal(result.sizing.matchesPerTeamMin, 2);
    assert.equal(result.sizing.matchesPerTeamMax, 2);
  });

  it("accepts the 4 Game team boundary as a single Pool", () => {
    const result = sizeFriendlyTournament(TOURNAMENT_TEAM_MIN, 1);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.deepEqual(result.sizing.poolSizes, [4]);
    assert.equal(result.sizing.uneven, false);
    assert.equal(result.sizing.poolMatches, 6);
    assert.equal(result.sizing.matchesPerTeamMin, 3);
    assert.equal(result.sizing.matchesPerTeamMax, 3);
    assert.equal(result.sizing.roundCount, 3);
    assert.equal(result.sizing.playerCount, 8);
    assert.equal(maxPoolCount(TOURNAMENT_TEAM_MIN), 1);
  });

  it("accepts the 32 Game team boundary as a single Pool", () => {
    const result = sizeFriendlyTournament(TOURNAMENT_TEAM_MAX, 1);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.deepEqual(result.sizing.poolSizes, [32]);
    assert.equal(result.sizing.poolMatches, 496);
    assert.equal(result.sizing.matchesPerTeamMin, 31);
    assert.equal(result.sizing.roundCount, 31);
    assert.equal(result.sizing.playerCount, 64);
  });

  it("uses one Pool so everyone plays everyone", () => {
    const result = sizeFriendlyTournament(12, 1);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.deepEqual(result.sizing.poolSizes, [12]);
    assert.equal(result.sizing.poolMatches, 66);
    assert.equal(result.sizing.matchesPerTeamMin, 11);
    assert.equal(result.sizing.roundCount, 11);
  });

  it("caps Pools at a third of the Game team count", () => {
    assert.equal(maxPoolCount(12), 4);
    const result = sizeFriendlyTournament(12, 4);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.deepEqual(result.sizing.poolSizes, [3, 3, 3, 3]);
    assert.equal(result.sizing.poolMatches, 12);
    assert.equal(result.sizing.matchesPerTeamMin, 2);
    assert.equal(result.sizing.roundCount, 3);
  });

  it("uses the maximum Pool count at 32 Game teams", () => {
    assert.equal(maxPoolCount(TOURNAMENT_TEAM_MAX), 10);
    const result = sizeFriendlyTournament(TOURNAMENT_TEAM_MAX, 10);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.deepEqual(result.sizing.poolSizes, [4, 4, 3, 3, 3, 3, 3, 3, 3, 3]);
    assert.equal(result.sizing.uneven, true);
    assert.equal(result.sizing.poolMatches, 36);
    assert.equal(result.sizing.roundCount, 3);
  });

  it("refuses a team count below 4", () => {
    const result = sizeFriendlyTournament(2, 1);
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.issue.path, "teamCount");
    assert.match(result.issue.message, /4/u);
  });

  it("refuses a team count above 32", () => {
    const result = sizeFriendlyTournament(34, 1);
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.issue.path, "teamCount");
    assert.match(result.issue.message, /32/u);
  });

  it("refuses an odd team count", () => {
    const result = sizeFriendlyTournament(5, 1);
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.issue.path, "teamCount");
    assert.match(result.issue.message, /even/iu);
  });

  it("refuses a Pool count above a third of the team count", () => {
    const result = sizeFriendlyTournament(12, 5);
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.issue.path, "poolCount");
    assert.match(result.issue.message, /4/u);
  });
});

describe("oneDayFit", () => {
  it("places 45-minute slots from the start time", () => {
    const sizing = sizeFriendlyTournament(12, 3);
    assert.equal(sizing.ok, true);
    if (!sizing.ok) {
      return;
    }
    const start = new Date("2026-09-20T10:00:00");
    const finish = new Date("2026-09-20T14:00:00");
    const fit = oneDayFit({
      start,
      finish,
      poolMatches: sizing.sizing.poolMatches,
      courtCount: 4,
      matchMinutes: null,
    });
    assert.equal(fit.slotCount, 5);
    assert.equal(
      fit.lastFinish?.getTime(),
      start.getTime() + 5 * tournamentMatchMinutes(null) * 60 * 1000,
    );
    assert.equal(fit.overruns, false);
    assert.equal(tournamentMatchMinutes(null), 45);
    assert.equal(tournamentMatchMinutes(20), 20);
  });

  it("uses 20, 30, and 45 minute Game lengths", () => {
    const sizing = sizeFriendlyTournament(12, 3);
    assert.equal(sizing.ok, true);
    if (!sizing.ok) {
      return;
    }
    const start = new Date("2026-09-20T10:00:00");
    const finish = new Date("2026-09-20T18:00:00");
    for (const minutes of [20, 30, 45] as const) {
      const fit = oneDayFit({
        start,
        finish,
        poolMatches: sizing.sizing.poolMatches,
        courtCount: 4,
        matchMinutes: minutes,
      });
      assert.equal(
        fit.lastFinish?.getTime(),
        start.getTime() + 5 * minutes * 60 * 1000,
      );
    }
  });

  it("warns when the last Match would finish past the stated finish time", () => {
    const sizing = sizeFriendlyTournament(12, 3);
    assert.equal(sizing.ok, true);
    if (!sizing.ok) {
      return;
    }
    const start = new Date("2026-09-20T10:00:00");
    const finish = new Date("2026-09-20T13:00:00");
    const fit = oneDayFit({
      start,
      finish,
      poolMatches: sizing.sizing.poolMatches,
      courtCount: 4,
      matchMinutes: null,
    });
    assert.equal(fit.overruns, true);
    assert.equal(
      fit.lastFinish?.getTime(),
      start.getTime() + 5 * 45 * 60 * 1000,
    );
    assert.match(ONE_DAY_OVERRUN_MESSAGE, /Court/u);
    assert.match(ONE_DAY_OVERRUN_MESSAGE, /Game teams/u);
  });
});

describe("balancedPoolSizes", () => {
  it("gives the first remainder Pools one extra team", () => {
    assert.deepEqual(balancedPoolSizes(10, 3), [4, 3, 3]);
    assert.deepEqual(balancedPoolSizes(8, 2), [4, 4]);
    assert.deepEqual(balancedPoolSizes(6, 2), [3, 3]);
  });
});

describe("poolCountForDrawnField", () => {
  it("keeps the requested Pool count when it still fits", () => {
    assert.equal(poolCountForDrawnField(10, 3), 3);
    assert.equal(poolCountForDrawnField(12, 3), 3);
  });

  it("clamps to a third of the real Game team count", () => {
    assert.equal(poolCountForDrawnField(6, 3), 2);
    assert.equal(poolCountForDrawnField(8, 3), 2);
    assert.equal(poolCountForDrawnField(4, 3), 1);
  });
});

describe("defaults", () => {
  it("defaults to 12 Game teams and 3 Pools", () => {
    assert.equal(TOURNAMENT_DEFAULT_TEAM_COUNT, 12);
    assert.equal(TOURNAMENT_DEFAULT_POOL_COUNT, 3);
    assert.equal(defaultPoolCount(12), 3);
    assert.equal(defaultPoolCount(4), 1);
  });
});

describe("formatPoolSizeLine", () => {
  it("names even groups", () => {
    const result = sizeFriendlyTournament(12, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(formatPoolSizeLine(result.sizing), "3 groups of 4");
    assert.match(formatPoolSizeLine(result.sizing), /groups/u);
  });

  it("names a single group", () => {
    const result = sizeFriendlyTournament(12, 1);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(formatPoolSizeLine(result.sizing), "1 group of 12");
  });

  it("names uneven groups", () => {
    const result = sizeFriendlyTournament(10, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(
      formatPoolSizeLine(result.sizing),
      "1 group of 4, 2 groups of 3",
    );
    assert.equal(result.sizing.uneven, true);
    assert.match(formatPoolSizeLine(result.sizing), /groups?/u);
  });
});

describe("formatMatchesPerTeam", () => {
  it("uses one count when Pools are even", () => {
    const result = sizeFriendlyTournament(12, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(
      formatMatchesPerTeam(result.sizing),
      "Each Game team plays 3 Matches",
    );
  });

  it("names both sizes when Pools are uneven", () => {
    const result = sizeFriendlyTournament(10, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(
      formatMatchesPerTeam(result.sizing),
      "Game teams in a larger group play 3 Matches; Game teams in a smaller group play 2 Matches",
    );
    assert.match(formatMatchesPerTeam(result.sizing), /group/u);
  });
});

describe("create-screen copy", () => {
  it("names players in pairs and Courts without a knockout clause", () => {
    assert.equal(
      playersInPairsLine(12),
      "24 players in pairs. Two seats per team.",
    );
    assert.equal(courtCountValue(0), "None");
    assert.equal(courtCountValue(1), "1 Court");
    assert.equal(courtCountValue(2), "2 Courts");
    assert.equal(
      lastMatchFinishCopy("7:45 PM"),
      "The last Match would finish at 7:45 PM.",
    );
  });
});
