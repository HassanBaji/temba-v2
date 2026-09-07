import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { createHomeFixtures } from "./home";

describe("createHomeFixtures", () => {
  const now = new Date("2026-09-07T12:00:00.000Z");
  const { provisional, confirmed, empty } = createHomeFixtures(now);

  it("puts Provisional and confirmed Level states in separate records", () => {
    assert.equal(provisional.level.provisional, true);
    assert.equal(confirmed.level.provisional, false);
    assert.ok(provisional.level.band);
    assert.ok(confirmed.level.band);
  });

  it("gives the empty record no games, no Rating, and unplayed form", () => {
    assert.equal(empty.nextGame, null);
    assert.equal(empty.comingUp.length, 0);
    assert.equal(empty.level.band, null);
    assert.equal(empty.level.canSelfDeclare, true);
    assert.equal(empty.recentForm.length, 0);
    assert.equal(empty.gamesPlayed, 0);
  });
});
