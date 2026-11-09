import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  homeComingUpRows,
  homeComingUpSeatBars,
  type HomeComingUpSource,
} from "./home-coming-up";

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
    rated: true,
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

describe("homeComingUpRows", () => {
  it("keeps a Friendly game as a seat row", () => {
    const [row] = homeComingUpRows([friendly()], "en");
    assert.deepEqual(row, {
      kind: "game",
      id: "friendly-1",
      rated: true,
      rowKey: "friendly-1",
      venueName: "Padelhuset Bromma",
      startsAt: STARTS,
      seatsTaken: 3,
      seatsTotal: 4,
      sport: null,
      occupancyLabel: null,
    });
  });

  it("shows a football Game as a count with its sport, not seat bars", () => {
    const [row] = homeComingUpRows(
      [
        friendly({
          sport: "football",
          registeredUserCount: 7,
          playersAllowed: 10,
        }),
      ],
      "en",
    );
    assert.equal(row?.kind, "game");
    if (row?.kind === "game") {
      assert.equal(row.sport, "football");
      assert.equal(row.occupancyLabel, "7/10");
      assert.equal(row.seatsTotal, 10);
    }
  });

  it("carries the rated flag onto every row kind", () => {
    const rows = homeComingUpRows(
      [friendly({ rated: false }), tournament({ rated: false })],
      "en",
    );
    assert.deepEqual(
      rows.map((row) => row.rated),
      [false, false],
    );
  });

  it("shows a drawn tournament as one tournament row, not a Match row", () => {
    const [row] = homeComingUpRows(
      [
        tournament({
          tournament: {
            drawPosted: true,
            teams: [
              { isViewerTeam: true, poolIndex: 0, left: YOU, right: SOFIA },
              { isViewerTeam: false, poolIndex: 1, left: MAJA, right: OSKAR },
            ],
          },
        }),
      ],
      "en",
    );
    assert.equal(row?.kind, "tournament");
    assert.equal(row?.rowKey, "cup-1");
  });

  it("shows a tournament before the draw with its teams and no action once the viewer is in", () => {
    const [row] = homeComingUpRows([tournament()], "en");
    assert.deepEqual(row, {
      kind: "tournament",
      id: "cup-1",
      rated: true,
      rowKey: "cup-1",
      title: "Friday Cup",
      startsAt: STARTS,
      teamsLine: "5 of 8 teams in",
      actionLabel: null,
    });
  });

  it("keeps the join action for an organizer who is not in yet", () => {
    const [row] = homeComingUpRows(
      [
        tournament({
          isRegistered: false,
          isSeated: false,
          canRegister: true,
          tournament: { drawPosted: false, teams: [] },
        }),
      ],
      "en",
    );
    assert.equal(row?.kind, "tournament");
    assert.equal(
      row?.kind === "tournament" ? row.actionLabel : null,
      "Join tournament",
    );
  });

  it("asks a Half team to invite a partner", () => {
    const [row] = homeComingUpRows(
      [
        tournament({
          tournament: {
            drawPosted: false,
            teams: [
              { isViewerTeam: true, poolIndex: null, left: YOU, right: null },
            ],
          },
        }),
      ],
      "en",
    );
    assert.equal(
      row?.kind === "tournament" ? row.actionLabel : null,
      "Invite a partner",
    );
  });
});

describe("homeComingUpSeatBars", () => {
  it("lists taken seats then open seats and says how many are open", () => {
    assert.deepEqual(
      homeComingUpSeatBars({ seatsTaken: 3, seatsTotal: 4 }, "en"),
      {
        bars: ["taken", "taken", "taken", "open"],
        spokenLabel: "Open seat",
      },
    );
    assert.equal(
      homeComingUpSeatBars({ seatsTaken: 1, seatsTotal: 4 }, "en").spokenLabel,
      "3 open seats",
    );
    assert.equal(
      homeComingUpSeatBars({ seatsTaken: 4, seatsTotal: 4 }, "en").spokenLabel,
      "All seats filled",
    );
  });

  it("speaks the open seats in Arabic", () => {
    assert.equal(
      homeComingUpSeatBars({ seatsTaken: 1, seatsTotal: 4 }, "ar").spokenLabel,
      "3 أماكن شاغرة",
    );
    const [row] = homeComingUpRows([friendly({ venue: null })], "ar");
    assert.equal(row?.kind === "game" ? row.venueName : null, "مباراة");
  });
});
