import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { hubGameCardPlan } from "./game-card";
import { createGamesHubFixtures } from "./games-hub-fixtures";
import { isTournamentMatchRow } from "./tournament-card";

describe("createGamesHubFixtures", () => {
  const fixtures = createGamesHubFixtures(new Date("2026-10-04T10:00:00Z"));

  it("offers a one-tap Join on the open Friendly roster only", () => {
    const [open, viewerIn, full] = fixtures.mixed.myGames;
    assert.equal(hubGameCardPlan(open!).primaryAction, "join");
    assert.equal(hubGameCardPlan(viewerIn!).primaryAction, "view");
    assert.equal(hubGameCardPlan(full!).primaryAction, "join_waitlist");
  });

  it("expands a drawn tournament into Match rows beside the tournament card", () => {
    const rows = fixtures.tournamentMatches.myGames;
    assert.deepEqual(
      rows.map((row) => isTournamentMatchRow(row)),
      [true, true, true, false],
    );
  });

  it("has empty lists for the empty state", () => {
    assert.equal(fixtures.empty.myGames.length, 0);
    assert.equal(fixtures.empty.history.length, 0);
  });
});
