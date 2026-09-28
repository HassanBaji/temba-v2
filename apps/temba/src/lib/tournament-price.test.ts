import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { schedulePoolMatches } from "./tournament-schedule";
import { sizeFriendlyTournament } from "./tournament-sizing";
import {
  viewerTournamentMatchCount,
  viewerTournamentTotalCents,
} from "./tournament-price";

describe("viewerTournamentTotalCents", () => {
  it("multiplies the per-player price by an even field's Matches per Game team", () => {
    const result = sizeFriendlyTournament(12, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.sizing.uneven, false);
    assert.equal(result.sizing.matchesPerTeamMin, 3);
    assert.equal(viewerTournamentTotalCents(10000, 3), 30000);
  });

  it("uses the viewer's own smaller Pool, not the maximum", () => {
    const result = sizeFriendlyTournament(10, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.sizing.uneven, true);
    assert.equal(result.sizing.matchesPerTeamMax, 3);
    assert.equal(result.sizing.matchesPerTeamMin, 2);
    assert.equal(
      viewerTournamentTotalCents(10000, result.sizing.matchesPerTeamMin),
      20000,
    );
    assert.notEqual(
      viewerTournamentTotalCents(10000, result.sizing.matchesPerTeamMin),
      viewerTournamentTotalCents(10000, result.sizing.matchesPerTeamMax),
    );
  });

  it("is null when the price is unset", () => {
    assert.equal(viewerTournamentTotalCents(null, 3), null);
    assert.equal(viewerTournamentTotalCents(undefined, 3), null);
  });
});

describe("viewerTournamentMatchCount", () => {
  const viewerUserId = "viewer";
  const teamIds = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];
  const gameTeams = teamIds.map((id) => ({
    id,
    members: id === "t1" ? [{ id: viewerUserId }, { id: "partner" }] : [],
  }));
  const windowStart = new Date(2026, 9, 3, 10, 0);
  const windowEnd = new Date(2026, 9, 3, 22, 0);

  function postedMatches(roundCount: number) {
    return schedulePoolMatches({
      pools: [
        { poolIndex: 0, gameTeamIds: teamIds.slice(0, 4) },
        { poolIndex: 1, gameTeamIds: teamIds.slice(4) },
      ],
      roundCount,
      courtIds: ["c1", "c2"],
      windowStart,
      windowEnd,
      matchMinutes: null,
    });
  }

  function posted(matches: ReturnType<typeof postedMatches>) {
    return {
      viewerUserId,
      teamsAllowed: 8,
      poolCount: 2,
      roundCount: null,
      drawPostedAt: new Date(2026, 9, 1),
      gameTeams,
      matches,
    };
  }

  it("counts the viewer's posted Matches for one Pass", () => {
    const count = viewerTournamentMatchCount(posted(postedMatches(3)));
    assert.equal(count, 3);
    assert.equal(viewerTournamentTotalCents(1000, count ?? -1), 3000);
  });

  it("counts both meetings when two Passes are posted", () => {
    const count = viewerTournamentMatchCount(posted(postedMatches(6)));
    assert.equal(count, 6);
    assert.equal(viewerTournamentTotalCents(1000, count ?? -1), 6000);
  });

  it("counts only the posted Rounds of a partial Pass", () => {
    assert.equal(viewerTournamentMatchCount(posted(postedMatches(2))), 2);
    assert.equal(viewerTournamentMatchCount(posted(postedMatches(4))), 4);
  });

  it("keeps a voided Match in the count", () => {
    const matches = postedMatches(3).map((match, index) =>
      index === 0 ? { ...match, status: "cancelled" } : match,
    );
    assert.equal(viewerTournamentMatchCount(posted(matches)), 3);
  });

  it("follows the posted Matches, not the planned field", () => {
    assert.equal(
      viewerTournamentMatchCount({
        ...posted(postedMatches(3)),
        teamsAllowed: 12,
        poolCount: 2,
        roundCount: 10,
      }),
      3,
    );
  });

  it("is null after the draw when the viewer has no Game team or no Match", () => {
    assert.equal(
      viewerTournamentMatchCount({
        ...posted(postedMatches(3)),
        viewerUserId: "someone-else",
      }),
      null,
    );
    assert.equal(viewerTournamentMatchCount(posted([])), null);
  });

  function planned(
    teamsAllowed: number,
    poolCount: number,
    roundCount: number | null,
  ) {
    return {
      viewerUserId,
      teamsAllowed,
      poolCount,
      roundCount,
      drawPostedAt: null,
      gameTeams,
      matches: [],
    };
  }

  it("uses the chosen Rounds for an even planned field before the draw", () => {
    assert.equal(viewerTournamentMatchCount(planned(12, 3, 2)), 2);
    assert.equal(viewerTournamentMatchCount(planned(12, 3, 6)), 6);
    assert.equal(viewerTournamentMatchCount(planned(12, 3, 5)), 5);
  });

  it("is null before the draw when Matches per Game team is a range", () => {
    assert.equal(viewerTournamentMatchCount(planned(10, 3, null)), null);
    assert.equal(viewerTournamentMatchCount(planned(12, 4, 2)), null);
    assert.equal(viewerTournamentMatchCount(planned(12, 4, 4)), null);
  });

  it("matches the one-Pass count on the suggestion", () => {
    for (const [teamCount, poolCount] of [
      [12, 3],
      [8, 2],
      [12, 4],
      [16, 4],
      [10, 3],
      [14, 3],
    ] as const) {
      const sized = sizeFriendlyTournament(teamCount, poolCount);
      assert.equal(sized.ok, true);
      if (!sized.ok) {
        return;
      }
      const onePass = sized.sizing.uneven
        ? null
        : sized.sizing.matchesPerTeamMin;
      assert.equal(
        viewerTournamentMatchCount(planned(teamCount, poolCount, null)),
        onePass,
      );
    }
  });

  it("is null without a planned field", () => {
    assert.equal(
      viewerTournamentMatchCount({
        ...planned(12, 3, null),
        poolCount: null,
      }),
      null,
    );
  });
});
