import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeComingUpRows, type HomeComingUpSource } from "./home-coming-up";

const STARTS = new Date("2026-09-29T17:30:00.000Z");

const YOU = { name: "Sam Rivera", isViewer: true };
const SOFIA = { name: "Sofia Rossi", isViewer: false };
const MAJA = { name: "Maja Svensson", isViewer: false };
const OSKAR = { name: "Oskar Toll", isViewer: false };

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
    registrationMode: "individual",
    canRegister: false,
    canWaitlist: false,
    joinFrozen: false,
    isRegistered: true,
    isSeated: true,
    isWaitlisted: false,
    registrationStatus: "open",
    registeredTeamCount: 0,
    teamsAllowed: null,
    tournament: null,
    ...overrides,
  };
}

function tournament(
  overrides: Partial<HomeComingUpSource> = {},
): HomeComingUpSource {
  return friendly({
    id: "cup-1",
    format: "friendly_tournament",
    poolCount: 2,
    name: "Friday Cup",
    registeredTeamCount: 5,
    teamsAllowed: 8,
    tournament: {
      drawPosted: false,
      teams: [
        { isViewerTeam: true, poolIndex: null, left: YOU, right: SOFIA },
        { isViewerTeam: false, poolIndex: null, left: MAJA, right: OSKAR },
      ],
    },
    ...overrides,
  });
}

function poolMatch(
  overrides: Partial<HomeComingUpSource> = {},
): HomeComingUpSource {
  return tournament({
    matchId: "match-2",
    roundNumber: 2,
    roundCount: 3,
    sides: [
      { left: YOU, right: SOFIA },
      { left: MAJA, right: OSKAR },
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

  it("shows a Pool Match behind the hero as a tournament Match row", () => {
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

  it("shows a tournament before the draw with its teams and no action once the viewer is in", () => {
    const [row] = homeComingUpRows([tournament()]);
    assert.deepEqual(row, {
      kind: "tournament",
      id: "cup-1",
      rowKey: "cup-1",
      title: "Friday Cup",
      startsAt: STARTS,
      teamsLine: "5 of 8 teams in",
      actionLabel: null,
    });
  });

  it("keeps the join action for an organizer who is not in yet", () => {
    const [row] = homeComingUpRows([
      tournament({
        isRegistered: false,
        isSeated: false,
        canRegister: true,
        tournament: { drawPosted: false, teams: [] },
      }),
    ]);
    assert.equal(row?.kind, "tournament");
    assert.equal(
      row?.kind === "tournament" ? row.actionLabel : null,
      "Join tournament",
    );
  });

  it("asks a Half team to invite a partner", () => {
    const [row] = homeComingUpRows([
      tournament({
        tournament: {
          drawPosted: false,
          teams: [
            { isViewerTeam: true, poolIndex: null, left: YOU, right: null },
          ],
        },
      }),
    ]);
    assert.equal(
      row?.kind === "tournament" ? row.actionLabel : null,
      "Invite a partner",
    );
  });
});
