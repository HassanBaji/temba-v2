import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeComingUpRows, type HomeComingUpSource } from "./home-coming-up";

const STARTS = new Date("2026-09-29T17:30:00.000Z");

function friendly(
  overrides: Partial<HomeComingUpSource> = {},
): HomeComingUpSource {
  return {
    id: "friendly-1",
    matchId: null,
    format: "friendly_game",
    poolCount: null,
    name: "Friday rematch",
    venue: { name: "Padelhuset Bromma" },
    startTime: STARTS,
    registeredUserCount: 3,
    playersAllowed: 4,
    sides: [],
    roundNumber: null,
    roundCount: null,
    ...overrides,
  };
}

function poolMatch(
  overrides: Partial<HomeComingUpSource> = {},
): HomeComingUpSource {
  return friendly({
    id: "cup-1",
    matchId: "match-2",
    format: "friendly_tournament",
    poolCount: 2,
    name: "Friday Cup",
    roundNumber: 2,
    roundCount: 3,
    sides: [
      {
        left: { name: "Sam Rivera", isViewer: true },
        right: { name: "Sofia Rossi", isViewer: false },
      },
      {
        left: { name: "Maja Svensson", isViewer: false },
        right: { name: "Oskar Toll", isViewer: false },
      },
    ],
    ...overrides,
  });
}

describe("homeComingUpRows", () => {
  it("keeps a Friendly game as a seat row", () => {
    const [row] = homeComingUpRows([friendly()]);
    assert.deepEqual(row, {
      kind: "game",
      id: "friendly-1",
      rowKey: "friendly-1",
      venueName: "Padelhuset Bromma",
      startsAt: STARTS,
      seatsTaken: 3,
      seatsTotal: 4,
    });
  });

  it("shows a Pool Match behind the hero as a tournament row", () => {
    const rows = homeComingUpRows([friendly(), poolMatch()]);
    assert.deepEqual(rows[1], {
      kind: "tournament_match",
      id: "cup-1",
      rowKey: "match-2",
      title: "Friday Cup",
      startsAt: STARTS,
      roundTag: "R2 of 3",
      opponentLine: "vs Maja S and Oskar T",
    });
  });

  it("keeps each Round of the same tournament as its own row", () => {
    const rows = homeComingUpRows([
      poolMatch(),
      poolMatch({ matchId: "match-3", roundNumber: 3 }),
    ]);
    assert.deepEqual(
      rows.map((row) => row.rowKey),
      ["match-2", "match-3"],
    );
    assert.equal(
      rows.every((row) => row.kind === "tournament_match"),
      true,
    );
  });

  it("leaves a tournament without a posted draw as a seat row", () => {
    const [row] = homeComingUpRows([
      poolMatch({ matchId: null, roundNumber: null, sides: [] }),
    ]);
    assert.equal(row?.kind, "game");
  });
});
