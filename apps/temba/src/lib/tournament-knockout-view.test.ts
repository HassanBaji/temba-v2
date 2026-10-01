import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  draftKnockoutFirstRound,
  hasDraftKnockoutDraw,
  knockoutChampion,
  knockoutChampionLine,
  knockoutPlaceMetaLine,
  knockoutSideLabel,
  postedKnockoutRounds,
} from "~/lib/tournament-knockout-view";

function team(id: string, seed: number | null, viewer = false) {
  return {
    id,
    name: null,
    knockoutSeed: seed,
    members: [
      { id: viewer ? "viewer" : `${id}-l`, name: `${id} L` },
      { id: `${id}-r`, name: `${id} R` },
    ],
  };
}

describe("draftKnockoutFirstRound", () => {
  it("shows the drafted pairings and Byes in tree order", () => {
    const gameTeams = [
      team("a", 1, true),
      team("b", 2),
      team("c", 3),
      team("d", 4),
      team("e", 5),
      team("f", 6),
    ];
    assert.equal(hasDraftKnockoutDraw(gameTeams), true);
    const round = draftKnockoutFirstRound({
      gameTeams,
      viewerUserId: "viewer",
    });
    assert.equal(round?.name, "Quarter-finals");
    assert.deepEqual(
      round?.places.map((place) =>
        place.kind === "bye"
          ? `${place.code} ${knockoutSideLabel(place.side)} bye`
          : `${place.code} ${knockoutSideLabel(place.slot1)} v ${knockoutSideLabel(place.slot2)}`,
      ),
      [
        "Q1 a L / a R bye",
        "Q2 d L / d R v e L / e R",
        "Q3 b L / b R bye",
        "Q4 c L / c R v f L / f R",
      ],
    );
    const first = round?.places[0];
    assert.equal(
      first?.kind === "bye" &&
        first.side.kind === "team" &&
        first.side.team.isViewer,
      true,
    );
  });

  it("is empty until the knockout is drafted", () => {
    const gameTeams = [team("a", null), team("b", null)];
    assert.equal(hasDraftKnockoutDraw(gameTeams), false);
    assert.equal(
      draftKnockoutFirstRound({ gameTeams, viewerUserId: "viewer" }),
      null,
    );
  });
});

describe("postedKnockoutRounds", () => {
  it("is null without Knockout Matches", () => {
    assert.equal(
      postedKnockoutRounds({
        matches: [
          {
            id: "pool",
            knockoutRound: null,
            knockoutPosition: null,
            startTime: null,
            courtName: null,
            slot1GameTeamId: "a",
            slot2GameTeamId: "b",
            status: "pending",
            result: "none",
          },
        ],
        gameTeams: [team("a", null), team("b", null)],
        viewerUserId: "viewer",
      }),
      null,
    );
  });

  it("derives Winner of placeholders from the Match each slot is fed by", () => {
    const rounds = postedKnockoutRounds({
      matches: [
        {
          id: "s1",
          knockoutRound: 1,
          knockoutPosition: 1,
          startTime: null,
          courtName: null,
          slot1GameTeamId: "a",
          slot2GameTeamId: "b",
          status: "pending",
          result: "none",
        },
        {
          id: "s2",
          knockoutRound: 1,
          knockoutPosition: 2,
          startTime: null,
          courtName: null,
          slot1GameTeamId: "c",
          slot2GameTeamId: "d",
          status: "pending",
          result: "none",
        },
        {
          id: "f",
          knockoutRound: 2,
          knockoutPosition: 1,
          startTime: null,
          courtName: null,
          slot1GameTeamId: null,
          slot2GameTeamId: null,
          status: "pending",
          result: "none",
        },
      ],
      gameTeams: [team("a", 1), team("b", 2), team("c", 3), team("d", 4)],
      viewerUserId: "viewer",
    });
    const final = rounds?.[1]?.places[0];
    assert.equal(rounds?.[1]?.name, "Final");
    assert.equal(final?.kind, "match");
    if (final?.kind !== "match") {
      return;
    }
    assert.equal(final.code, "Final");
    assert.equal(knockoutSideLabel(final.slot1), "Winner of S1");
    assert.equal(knockoutSideLabel(final.slot2), "Winner of S2");
  });
});

describe("knockout results in the posted tree", () => {
  const twoRoundMatches = (overrides: {
    s1: { status: string; result: "slot1" | "slot2" | "draw" | "none" };
    final: {
      status: string;
      result: "slot1" | "slot2" | "draw" | "none";
      slot1GameTeamId: string | null;
    };
  }) => [
    {
      id: "s1",
      knockoutRound: 1,
      knockoutPosition: 1,
      startTime: null,
      courtName: null,
      slot1GameTeamId: "a",
      slot2GameTeamId: "b",
      ...overrides.s1,
    },
    {
      id: "s2",
      knockoutRound: 1,
      knockoutPosition: 2,
      startTime: null,
      courtName: null,
      slot1GameTeamId: "c",
      slot2GameTeamId: "d",
      status: "completed",
      result: "slot2" as const,
    },
    {
      id: "f",
      knockoutRound: 2,
      knockoutPosition: 1,
      startTime: null,
      courtName: null,
      slot2GameTeamId: "d",
      ...overrides.final,
    },
  ];
  const gameTeams = [team("a", 1), team("b", 2), team("c", 3), team("d", 4)];

  it("asks for a deciding Set on a level Knockout Match and names no Champion yet", () => {
    const rounds = postedKnockoutRounds({
      matches: twoRoundMatches({
        s1: { status: "pending", result: "draw" },
        final: { status: "pending", result: "none", slot1GameTeamId: null },
      }),
      gameTeams,
      viewerUserId: "viewer",
    });
    const semi = rounds?.[0]?.places[0];
    assert.equal(semi?.kind === "match" && semi.needsDecidingSet, true);
    assert.equal(semi?.kind === "match" ? semi.winner : "bye", null);
    const otherSemi = rounds?.[0]?.places[1];
    assert.equal(otherSemi?.kind === "match" ? otherSemi.winner : null, 2);
    assert.equal(knockoutChampion(rounds), null);
  });

  it("names the winner of a completed Final as Champion", () => {
    const rounds = postedKnockoutRounds({
      matches: twoRoundMatches({
        s1: { status: "completed", result: "slot1" },
        final: { status: "completed", result: "slot2", slot1GameTeamId: "a" },
      }),
      gameTeams,
      viewerUserId: "viewer",
    });
    const champion = knockoutChampion(rounds);
    assert.equal(champion?.gameTeamId, "d");
    assert.equal(
      champion ? knockoutChampionLine(champion) : null,
      "Champion: d L / d R",
    );
  });
});

describe("knockoutPlaceMetaLine", () => {
  it("joins the time and the Court", () => {
    assert.equal(knockoutPlaceMetaLine(null, "Court 1"), "Court 1");
    assert.equal(knockoutPlaceMetaLine(null, null), null);
  });
});
