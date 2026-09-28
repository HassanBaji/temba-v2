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
  poolPassLength,
  resolvePlannedRoundCount,
  resolveRoundCount,
  reviewRoundsValue,
  roundCountLabel,
  roundCountRange,
  ROUND_MEETS_COPY,
  sizeFriendlyTournament,
  suggestedRoundCount,
  suggestedRoundsResetLabel,
  formatRoundMatchesPerTeam,
  validateRoundCount,
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
    assert.equal(
      ONE_DAY_OVERRUN_MESSAGE,
      "This runs past your finish time. Add a Court, cut Rounds, or take fewer Game teams.",
    );
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

describe("suggestedRoundCount and roundCountRange", () => {
  it("suggests one Pass of the biggest even Pool and allows up to two", () => {
    assert.equal(poolPassLength(4), 3);
    assert.equal(suggestedRoundCount([4, 4, 4]), 3);
    assert.deepEqual(roundCountRange([4, 4, 4]), {
      min: 1,
      max: 6,
      suggested: 3,
    });
  });

  it("adds the bye Round for an odd biggest Pool", () => {
    assert.equal(poolPassLength(5), 5);
    assert.equal(suggestedRoundCount([3, 3]), 3);
    assert.deepEqual(roundCountRange([5, 5, 4]), {
      min: 1,
      max: 10,
      suggested: 5,
    });
  });

  it("follows the biggest Pool when Pools are uneven", () => {
    assert.equal(suggestedRoundCount([4, 3, 3]), 3);
    assert.equal(suggestedRoundCount([3, 4]), 3);
    assert.equal(suggestedRoundCount([5, 4]), 5);
  });

  it("matches the Round count sizeFriendlyTournament derives", () => {
    for (const [teamCount, poolCount] of [
      [12, 3],
      [10, 3],
      [6, 2],
      [14, 3],
      [32, 1],
    ] as const) {
      const sized = sizeFriendlyTournament(teamCount, poolCount);
      assert.equal(sized.ok, true);
      if (!sized.ok) {
        return;
      }
      assert.equal(
        suggestedRoundCount(sized.sizing.poolSizes),
        sized.sizing.roundCount,
      );
    }
  });
});

describe("resolveRoundCount", () => {
  it("follows the field's suggestion when nothing is stored", () => {
    assert.equal(resolveRoundCount([4, 4, 4], null), 3);
    assert.equal(resolveRoundCount([4, 4, 4], undefined), 3);
    assert.equal(resolveRoundCount([3, 3], null), 3);
  });

  it("keeps an explicit count inside the range", () => {
    assert.equal(resolveRoundCount([4, 4, 4], 2), 2);
    assert.equal(resolveRoundCount([4, 4, 4], 6), 6);
  });

  it("clamps an explicit count to two Passes of the field", () => {
    assert.equal(resolveRoundCount([4], 10), 6);
    assert.equal(resolveRoundCount([5, 5, 4], 11), 10);
  });

  it("has no Round count when there are no Pools", () => {
    assert.equal(resolveRoundCount([], null), null);
    assert.equal(resolveRoundCount([], 5), null);
  });
});

describe("resolvePlannedRoundCount", () => {
  it("resolves the stored count against the planned Game teams and groups", () => {
    assert.equal(resolvePlannedRoundCount(12, 3, null), 3);
    assert.equal(resolvePlannedRoundCount(12, 3, 5), 5);
    assert.equal(resolvePlannedRoundCount(12, 3, 9), 6);
    assert.equal(resolvePlannedRoundCount(12, 1, null), 11);
  });

  it("is null without a planned field or for a field that does not size", () => {
    assert.equal(resolvePlannedRoundCount(null, 3, 5), null);
    assert.equal(resolvePlannedRoundCount(12, null, 5), null);
    assert.equal(resolvePlannedRoundCount(11, 3, null), null);
  });
});

describe("validateRoundCount", () => {
  it("stores null for an omitted count or the suggestion", () => {
    assert.deepEqual(validateRoundCount([4, 4, 4], undefined), {
      ok: true,
      roundCount: null,
    });
    assert.deepEqual(validateRoundCount([4, 4, 4], null), {
      ok: true,
      roundCount: null,
    });
    assert.deepEqual(validateRoundCount([4, 4, 4], 3), {
      ok: true,
      roundCount: null,
    });
  });

  it("keeps an explicit count from 1 to twice the suggestion", () => {
    assert.deepEqual(validateRoundCount([4, 4, 4], 1), {
      ok: true,
      roundCount: 1,
    });
    assert.deepEqual(validateRoundCount([4, 4, 4], 6), {
      ok: true,
      roundCount: 6,
    });
  });

  it("refuses 0 and more than two Passes on roundCount", () => {
    for (const roundCount of [0, 7, -1, 2.5]) {
      const result = validateRoundCount([4, 4, 4], roundCount);
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.issue.path, "roundCount");
      assert.equal(result.issue.message, "Rounds must be between 1 and 6");
    }
  });
});

describe("Rounds copy", () => {
  it("names Rounds, the suggestion and the meets states", () => {
    assert.equal(roundCountLabel(1), "1 Round");
    assert.equal(roundCountLabel(5), "5 Rounds");
    assert.equal(reviewRoundsValue(3, 3), "3 Rounds · suggested");
    assert.equal(reviewRoundsValue(5, 3), "5 Rounds");
    assert.equal(suggestedRoundsResetLabel(3), "Use suggested (3)");
    assert.deepEqual(ROUND_MEETS_COPY, {
      once: "Everyone meets once",
      partial: "Not everyone meets",
      twice: "Everyone meets twice",
      somePartialSecond: "Some meet twice",
    });
  });

  it("shows one Matches per Game team count or a range", () => {
    assert.equal(
      formatRoundMatchesPerTeam({ matchesPerTeamMin: 1, matchesPerTeamMax: 1 }),
      "Each Game team plays 1 Match",
    );
    assert.equal(
      formatRoundMatchesPerTeam({ matchesPerTeamMin: 3, matchesPerTeamMax: 3 }),
      "Each Game team plays 3 Matches",
    );
    assert.equal(
      formatRoundMatchesPerTeam({ matchesPerTeamMin: 2, matchesPerTeamMax: 3 }),
      "Each Game team plays 2 to 3 Matches",
    );
  });
});
