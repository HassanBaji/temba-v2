import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  canCancelKnockoutPlace,
  draftKnockoutFirstRound,
  hasDraftKnockoutDraw,
  knockoutCancelDescription,
  knockoutCancelPrompt,
  knockoutChampion,
  knockoutChampionLine,
  knockoutPlaceMetaLine,
  knockoutSideLabel,
  postedKnockoutRounds,
} from "./tournament-knockout-view";

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

  it("shows the Set scores of a completed Match and nothing on an open one", () => {
    const [s1, s2, final] = twoRoundMatches({
      s1: { status: "pending", result: "none" },
      final: { status: "pending", result: "none", slot1GameTeamId: null },
    });
    const rounds = postedKnockoutRounds({
      matches: [
        { ...s1!, sets: [{ slot1GamesWon: 6, slot2GamesWon: 3 }] },
        {
          ...s2!,
          sets: [
            { slot1GamesWon: 3, slot2GamesWon: 6 },
            { slot1GamesWon: 4, slot2GamesWon: 6 },
          ],
        },
        final!,
      ],
      gameTeams,
      viewerUserId: "viewer",
    });
    const places = rounds?.[0]?.places ?? [];
    const first = places[0];
    const second = places[1];
    assert.equal(first?.kind === "match" ? first.scoreLabel : "?", null);
    assert.equal(second?.kind === "match" ? second.scoreLabel : "?", "3-6 4-6");
  });

  it("offers Cancel Match only while a team is in the Match and it is unsettled", () => {
    const rounds = postedKnockoutRounds({
      matches: twoRoundMatches({
        s1: { status: "pending", result: "none" },
        final: { status: "pending", result: "none", slot1GameTeamId: null },
      }),
      gameTeams,
      viewerUserId: "viewer",
    });
    const [s1, s2] = rounds?.[0]?.places ?? [];
    const final = rounds?.[1]?.places[0];
    assert.equal(s1 && canCancelKnockoutPlace(s1), true);
    assert.equal(s2 && canCancelKnockoutPlace(s2), false);
    assert.equal(final && canCancelKnockoutPlace(final), true);
    const emptyFinal = postedKnockoutRounds({
      matches: twoRoundMatches({
        s1: { status: "pending", result: "none" },
        final: { status: "pending", result: "none", slot1GameTeamId: null },
      }).map((match) =>
        match.id === "f" ? { ...match, slot2GameTeamId: null } : match,
      ),
      gameTeams,
      viewerUserId: "viewer",
    })?.[1]?.places[0];
    assert.equal(emptyFinal && canCancelKnockoutPlace(emptyFinal), false);
  });

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

describe("Walkovers in the posted tree", () => {
  const gameTeams = [team("a", 1), team("b", 2), team("c", 3), team("d", 4)];
  const final = (overrides: {
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
    status: string;
    walkoverGameTeamId: string | null;
  }) => ({
    id: "f",
    knockoutRound: 2,
    knockoutPosition: 1,
    startTime: null,
    courtName: null,
    result: "none" as const,
    ...overrides,
  });
  const semis = [
    {
      id: "s1",
      knockoutRound: 1,
      knockoutPosition: 1,
      startTime: null,
      courtName: null,
      slot1GameTeamId: "a",
      slot2GameTeamId: "b",
      status: "cancelled",
      result: "none" as const,
      walkoverGameTeamId: "b",
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
      result: "slot1" as const,
    },
  ];

  it("marks the awarded side as a Walkover, never as a played win", () => {
    const rounds = postedKnockoutRounds({
      matches: [
        ...semis,
        final({
          slot1GameTeamId: "b",
          slot2GameTeamId: "c",
          status: "pending",
          walkoverGameTeamId: null,
        }),
      ],
      gameTeams,
      viewerUserId: "viewer",
    });
    const semi = rounds?.[0]?.places[0];
    assert.equal(semi?.kind, "match");
    if (semi?.kind !== "match") {
      return;
    }
    assert.equal(semi.walkover, 2);
    assert.equal(semi.winner, null);
    assert.equal(semi.settled, true);
    assert.equal(knockoutChampion(rounds), null);
  });

  it("names the team awarded the Final as Champion", () => {
    const rounds = postedKnockoutRounds({
      matches: [
        ...semis,
        final({
          slot1GameTeamId: "b",
          slot2GameTeamId: "c",
          status: "cancelled",
          walkoverGameTeamId: "c",
        }),
      ],
      gameTeams,
      viewerUserId: "viewer",
    });
    assert.equal(knockoutChampion(rounds)?.gameTeamId, "c");
  });

  it("names no Champion when the Final was cancelled with nobody through", () => {
    const rounds = postedKnockoutRounds({
      matches: [
        ...semis,
        final({
          slot1GameTeamId: null,
          slot2GameTeamId: null,
          status: "cancelled",
          walkoverGameTeamId: null,
        }),
      ],
      gameTeams,
      viewerUserId: "viewer",
    });
    assert.equal(knockoutChampion(rounds), null);
  });
});

describe("knockoutCancelPrompt", () => {
  const side = (gameTeamId: string) => ({
    kind: "team" as const,
    team: {
      gameTeamId,
      name: `${gameTeamId} L / ${gameTeamId} R`,
      isViewer: false,
    },
  });

  it("asks which team goes through only when both sides are present", () => {
    const prompt = knockoutCancelPrompt({ slot1: side("a"), slot2: side("b") });
    assert.equal(prompt.kind, "choose");
    assert.deepEqual(
      prompt.kind === "choose"
        ? prompt.teams.map((team) => team.gameTeamId)
        : [],
      ["a", "b"],
    );
    assert.equal(
      knockoutCancelDescription(prompt),
      "Choose which team goes through. The Match is shown as a Walkover and no Rating changes.",
    );
  });

  it("sends the only side through without a question", () => {
    const prompt = knockoutCancelPrompt({
      slot1: { kind: "winner_of", label: "Winner of Q1" },
      slot2: side("b"),
    });
    assert.equal(prompt.kind, "through");
    assert.equal(
      knockoutCancelDescription(prompt),
      "b L / b R goes through. The Match is shown as a Walkover and no Rating changes.",
    );
  });

  it("sends nobody through with no side present", () => {
    const prompt = knockoutCancelPrompt({
      slot1: { kind: "qualifier", label: "A1" },
      slot2: { kind: "open" },
    });
    assert.equal(prompt.kind, "nobody");
    assert.equal(
      knockoutCancelDescription(prompt),
      "Nobody goes through. This cannot be undone.",
    );
  });
});

describe("knockoutPlaceMetaLine", () => {
  it("joins the time and the Court", () => {
    assert.equal(knockoutPlaceMetaLine(null, "Court 1"), "Court 1");
    assert.equal(knockoutPlaceMetaLine(null, null), null);
  });
});
