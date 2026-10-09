import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  displayLabelFromStoredBand,
  nextDistinctDisplayRung,
} from "./level-bands";

import { createHomeFixtures } from "./home-fixtures";

describe("createHomeFixtures", () => {
  const now = new Date("2026-09-07T12:00:00.000Z");
  const { provisional, confirmed, needsResults, noGames, noGroup } =
    createHomeFixtures(now);

  it("puts Provisional and confirmed Level states in separate records", () => {
    assert.equal(provisional.level.provisional, true);
    assert.equal(confirmed.level.provisional, false);
    assert.ok(provisional.level.band);
    assert.ok(confirmed.level.band);
  });

  it("gives the no-games record no games, no Rating, and unplayed form", () => {
    assert.equal(noGames.nextGame, null);
    assert.equal(noGames.comingUp.length, 0);
    assert.equal(noGames.level.band, null);
    assert.equal(noGames.level.canSelfDeclare, true);
    assert.equal(noGames.recentForm.length, 0);
    assert.equal(noGames.gamesPlayed, 0);
  });

  it("covers the playing-now, add-results and no-Group states", () => {
    assert.equal(confirmed.nextGame?.phase, "ongoing");
    assert.equal(needsResults.nextGame?.phase, "needs_results");
    assert.equal(noGames.createGroupCount, 1);
    assert.equal(noGroup.createGroupCount, 0);
    assert.equal(noGroup.nextGame, null);
  });

  it("does not render stored C1 / B3 as the visible Home letter", () => {
    assert.equal(displayLabelFromStoredBand(provisional.level.band!), "C");
    assert.equal(nextDistinctDisplayRung(provisional.level.band!), "C+");
    assert.equal(displayLabelFromStoredBand(confirmed.level.band!), "C+");
    assert.equal(nextDistinctDisplayRung(confirmed.level.band!), "B");
    assert.notEqual(displayLabelFromStoredBand(confirmed.level.band!), "C1");
    assert.notEqual(nextDistinctDisplayRung(confirmed.level.band!), "B3");
  });
});
