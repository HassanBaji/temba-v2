import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  draftKnockoutFirstRound,
  hasDraftKnockoutDraw,
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
          ? `${place.code} ${place.team.name} bye`
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
    assert.equal(first?.kind === "bye" && first.team.isViewer, true);
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
        },
        {
          id: "s2",
          knockoutRound: 1,
          knockoutPosition: 2,
          startTime: null,
          courtName: null,
          slot1GameTeamId: "c",
          slot2GameTeamId: "d",
        },
        {
          id: "f",
          knockoutRound: 2,
          knockoutPosition: 1,
          startTime: null,
          courtName: null,
          slot1GameTeamId: null,
          slot2GameTeamId: null,
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

describe("knockoutPlaceMetaLine", () => {
  it("joins the time and the Court", () => {
    assert.equal(knockoutPlaceMetaLine(null, "Court 1"), "Court 1");
    assert.equal(knockoutPlaceMetaLine(null, null), null);
  });
});
