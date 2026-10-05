import { describe, expect, it } from "vitest";

import {
  kickableTournamentOccupants,
  mergeSelection,
  tournamentOrganizerView,
  tournamentRoundsPlan,
  type TournamentOrganizerGame,
  type TournamentRoundsGame,
} from "./tournament-organizer";
import { halfTeamsFromSides } from "./tournament-half-teams";

function person(userId: string) {
  return { userId, name: `Player ${userId}`, image: null };
}

function game(
  overrides: Partial<TournamentOrganizerGame> = {},
): TournamentOrganizerGame {
  return {
    isOrganizer: true,
    cancelledAt: null,
    viewerUserId: "org",
    canUndoDraw: false,
    sides: [
      { sideIndex: 1, gameTeamId: "t1", left: person("a"), right: null },
      { sideIndex: 2, gameTeamId: "t2", left: null, right: person("b") },
      {
        sideIndex: 3,
        gameTeamId: "t3",
        left: person("org"),
        right: person("c"),
      },
    ],
    ...overrides,
  };
}

const notDrawn = { drawn: false, partnerRequired: false };

describe("tournamentOrganizerView", () => {
  it("offers the merge entry and the draw before the draw", () => {
    const view = tournamentOrganizerView(game(), notDrawn);
    expect(view.merge).toBe("banner");
    expect(view.showDrawEntry).toBe(true);
    expect(view.showUndo).toBe(false);
  });

  it("offers undo only after the draw when the server allows it", () => {
    const drawn = { drawn: true, partnerRequired: false };
    expect(
      tournamentOrganizerView(game({ canUndoDraw: true }), drawn),
    ).toMatchObject({ merge: null, showDrawEntry: false, showUndo: true });
    expect(tournamentOrganizerView(game(), drawn).showUndo).toBe(false);
  });

  it("shows nothing to a non-Organizer or on a cancelled Game", () => {
    for (const overrides of [
      { isOrganizer: false },
      { cancelledAt: new Date() },
    ]) {
      expect(tournamentOrganizerView(game(overrides), notDrawn)).toMatchObject({
        active: false,
        merge: null,
        showDrawEntry: false,
        showUndo: false,
      });
    }
  });

  it("offers no merge for a partner-required Game", () => {
    expect(
      tournamentOrganizerView(game(), { drawn: false, partnerRequired: true })
        .merge,
    ).toBeNull();
  });

  it("offers the merge entry when more than two Half teams exist", () => {
    const sides = [
      ...game().sides,
      { sideIndex: 4, gameTeamId: "t4", left: person("d"), right: null },
    ];
    expect(tournamentOrganizerView(game({ sides }), notDrawn).merge).toBe(
      "entry",
    );
  });
});

describe("kickableTournamentOccupants", () => {
  it("lists seated players other than the Organizer", () => {
    expect(kickableTournamentOccupants(game()).map((p) => p.userId)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("lists nobody to a non-Organizer", () => {
    expect(kickableTournamentOccupants(game({ isOrganizer: false }))).toEqual(
      [],
    );
  });
});

describe("mergeSelection", () => {
  const halfTeams = halfTeamsFromSides(game().sides);

  it("pairs the first two Half teams and seats them on opposite sides", () => {
    const selection = mergeSelection({
      halfTeams,
      firstId: "",
      secondId: "",
      swapped: false,
    });
    expect(selection.first?.gameTeamId).toBe("t1");
    expect(selection.second?.gameTeamId).toBe("t2");
    expect(selection.canMerge).toBe(true);
    expect(selection.assignment).toEqual({
      firstPosition: "left",
      secondPosition: "right",
    });
  });

  it("swaps the seats", () => {
    const selection = mergeSelection({
      halfTeams,
      firstId: "t1",
      secondId: "t2",
      swapped: true,
    });
    expect(selection.assignment).toEqual({
      firstPosition: "right",
      secondPosition: "left",
    });
    expect(selection.canMerge).toBe(true);
  });

  it("falls back to another second Half team when it equals the first", () => {
    const four = halfTeamsFromSides([
      ...game().sides,
      { sideIndex: 4, gameTeamId: "t4", left: person("d"), right: null },
    ]);
    const selection = mergeSelection({
      halfTeams: four,
      firstId: "t2",
      secondId: "t2",
      swapped: false,
    });
    expect(selection.first?.gameTeamId).toBe("t2");
    expect(selection.second?.gameTeamId).toBe("t1");
  });

  it("cannot merge with fewer than two Half teams", () => {
    expect(
      mergeSelection({
        halfTeams: halfTeams.slice(0, 1),
        firstId: "",
        secondId: "",
        swapped: false,
      }).canMerge,
    ).toBe(false);
  });
});

describe("tournamentRoundsPlan", () => {
  const base: TournamentRoundsGame = {
    format: "friendly_tournament",
    poolCount: 2,
    drawPostedAt: null,
    teamsAllowed: 8,
    windowStart: null,
    windowEnd: null,
    recordedCourts: [],
    matchMinutes: 45,
  };

  it("suggests the pool pass length when nothing is stored", () => {
    const plan = tournamentRoundsPlan(base, null);
    expect(plan?.poolSizes).toEqual([4, 4]);
    expect(plan?.roundCount).toBe(plan?.range.suggested);
    expect(plan?.overruns).toBe(false);
  });

  it("keeps a stored Round count inside the range", () => {
    expect(tournamentRoundsPlan(base, 99)?.roundCount).toBe(
      tournamentRoundsPlan(base, null)?.range.max,
    );
  });

  it("offers nothing once the draw is posted or without pools", () => {
    expect(
      tournamentRoundsPlan({ ...base, drawPostedAt: new Date() }, null),
    ).toBeNull();
    expect(tournamentRoundsPlan({ ...base, poolCount: null }, null)).toBeNull();
  });

  it("flags a one-day window the Rounds overrun", () => {
    const plan = tournamentRoundsPlan(
      {
        ...base,
        windowStart: new Date("2026-10-10T10:00:00+03:00"),
        windowEnd: new Date("2026-10-10T11:00:00+03:00"),
        recordedCourts: [{ id: "c1" }],
      },
      null,
    );
    expect(plan?.overruns).toBe(true);
  });
});
