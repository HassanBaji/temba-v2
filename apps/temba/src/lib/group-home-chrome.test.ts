import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  groupHomeHeroMeta,
  groupHomeRecord,
  groupHomeSportLabel,
} from "./group-home-chrome";

describe("groupHomeSportLabel", () => {
  it("maps padel and football to display labels", () => {
    assert.equal(groupHomeSportLabel("padel"), "Padel");
    assert.equal(groupHomeSportLabel("football"), "Football");
  });
});

describe("groupHomeHeroMeta", () => {
  it("joins sport, members, and Community for a Club Group", () => {
    assert.equal(
      groupHomeHeroMeta({
        sport: "padel",
        memberCount: 12,
        communityName: "Ocean Club",
      }),
      "Padel · 12 members · Ocean Club",
    );
  });

  it("omits Community for a Loose Group", () => {
    assert.equal(
      groupHomeHeroMeta({
        sport: "football",
        memberCount: 1,
        communityName: null,
      }),
      "Football · 1 member",
    );
  });
});

describe("groupHomeRecord", () => {
  it("omits the strip for a non-member", () => {
    assert.deepEqual(groupHomeRecord(null), { kind: "none" });
  });

  it("uses the muted sentence when the member has 0 Games", () => {
    assert.deepEqual(
      groupHomeRecord({
        totalGamesPlayed: 0,
        totalSetsWon: 0,
        totalPointsWon: 0,
      }),
      { kind: "empty" },
    );
  });

  it("uses membership Games, Sets, and Points — not Group totals", () => {
    assert.deepEqual(
      groupHomeRecord({
        totalGamesPlayed: 4,
        totalSetsWon: 7,
        totalPointsWon: 21,
      }),
      { kind: "stats", games: 4, sets: 7, points: 21 },
    );
  });
});
