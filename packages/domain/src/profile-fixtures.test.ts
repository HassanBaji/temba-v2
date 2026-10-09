import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { profileAllTimeView } from "./profile-all-time";
import { createProfileFixtures } from "./profile-fixtures";
import { profileLevelView } from "./profile-level";

describe("createProfileFixtures", () => {
  const { provisional, confirmed, topBand, newPlayer } =
    createProfileFixtures();

  it("separates Provisional and confirmed Level states", () => {
    assert.equal(provisional.level?.provisional, true);
    assert.equal(confirmed.level?.provisional, false);
  });

  it("puts the top band on a rung with no next Level band", () => {
    assert.ok(topBand.level);
    assert.equal(profileLevelView(topBand.level).atTopBand, true);
  });

  it("gives a new player no Level, no form and no win rate", () => {
    assert.equal(newPlayer.level, null);
    assert.equal(newPlayer.recentForm.length, 0);
    assert.equal(profileAllTimeView(newPlayer.allTime).winRatePercent, null);
  });
});
