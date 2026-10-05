import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  homeNextGameActions,
  homeNextGameSecondaryLine,
  homeNextGameStatus,
} from "./home-next-game";

describe("homeNextGameActions", () => {
  it("deep-links Add results to the results intent", () => {
    assert.deepEqual(
      homeNextGameActions({
        gameId: "g1",
        phase: "needs_results",
        hasOpenSeat: false,
      }),
      {
        primary: {
          target: { kind: "game", gameId: "g1", intent: "results" },
          label: "Add results",
        },
        details: { kind: "game", gameId: "g1" },
      },
    );
  });

  it("deep-links Invite a player to the invite intent", () => {
    assert.deepEqual(
      homeNextGameActions({
        gameId: "g1",
        phase: "upcoming",
        hasOpenSeat: true,
      }),
      {
        primary: {
          target: { kind: "game", gameId: "g1", intent: "invite" },
          label: "Invite a player",
        },
        details: { kind: "game", gameId: "g1" },
      },
    );
  });

  it("drops Details when View game already goes to the game", () => {
    for (const args of [
      { phase: "upcoming", hasOpenSeat: false },
      { phase: "ongoing", hasOpenSeat: true },
    ] as const) {
      assert.deepEqual(homeNextGameActions({ gameId: "g1", ...args }), {
        primary: {
          target: { kind: "game", gameId: "g1" },
          label: "View game",
        },
        details: null,
      });
    }
  });
});

describe("homeNextGameStatus", () => {
  const now = new Date("2026-09-07T12:00:00.000Z");
  const later = new Date("2026-09-07T17:42:00.000Z");

  it("names the phase when the Game is under way or needs results", () => {
    assert.equal(homeNextGameStatus("ongoing", later, now), "Playing now");
    assert.equal(
      homeNextGameStatus("needs_results", later, now),
      "Add results",
    );
  });

  it("counts down to an upcoming Game and drops the countdown once it starts", () => {
    assert.equal(homeNextGameStatus("upcoming", later, now), "in 5h 42m");
    assert.equal(homeNextGameStatus("upcoming", now, later), null);
  });
});

describe("homeNextGameSecondaryLine", () => {
  it("joins court and format, skipping a missing court", () => {
    assert.equal(
      homeNextGameSecondaryLine("Court 1", "Doubles"),
      "Court 1 · Doubles",
    );
    assert.equal(homeNextGameSecondaryLine(null, "Doubles"), "Doubles");
  });
});
