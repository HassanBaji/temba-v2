import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  filterGroupMembersByName,
  groupHomeHasStandingResults,
  groupHomeHeroMeta,
  groupHomeMemberGamesLabel,
  groupHomeRecord,
  groupHomeSetScoreLine,
  groupHomeShowsMemberSearch,
  groupHomeSportLabel,
  groupHomeVenueCourtLine,
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

describe("groupHomeHasStandingResults", () => {
  it("is false when every member is still at zero", () => {
    assert.equal(
      groupHomeHasStandingResults([
        { totalSetsWon: 0, totalPointsWon: 0, totalGamesPlayed: 0 },
      ]),
      false,
    );
  });

  it("is true when anyone has sets, points, or Games", () => {
    assert.equal(
      groupHomeHasStandingResults([
        { totalSetsWon: 0, totalPointsWon: 0, totalGamesPlayed: 1 },
      ]),
      true,
    );
  });
});

describe("filterGroupMembersByName", () => {
  const members = [{ name: "Ada" }, { name: "Lin" }, { name: "Ada Lovelace" }];

  it("filters the already-loaded list by name", () => {
    assert.deepEqual(filterGroupMembersByName(members, "ada"), [
      { name: "Ada" },
      { name: "Ada Lovelace" },
    ]);
  });

  it("returns everyone when the query is blank", () => {
    assert.deepEqual(filterGroupMembersByName(members, "  "), members);
  });
});

describe("groupHomeShowsMemberSearch", () => {
  it("shows search only when there are more than eight members", () => {
    assert.equal(groupHomeShowsMemberSearch(8), false);
    assert.equal(groupHomeShowsMemberSearch(9), true);
  });
});

describe("groupHomeMemberGamesLabel", () => {
  it("uses Games from Games played", () => {
    assert.equal(groupHomeMemberGamesLabel(0), "0 Games");
    assert.equal(groupHomeMemberGamesLabel(3), "3 Games");
  });
});

describe("groupHomeVenueCourtLine", () => {
  it("joins Venue and Court when both are known", () => {
    assert.equal(
      groupHomeVenueCourtLine("Padel Club", "Court 1"),
      "Padel Club · Court 1",
    );
  });

  it("omits the missing side", () => {
    assert.equal(groupHomeVenueCourtLine("Padel Club", null), "Padel Club");
    assert.equal(groupHomeVenueCourtLine(null, "Court 1"), "Court 1");
  });
});

describe("groupHomeSetScoreLine", () => {
  it("formats scored Sets and invents nothing when scores are missing", () => {
    assert.equal(
      groupHomeSetScoreLine([
        { slot1GamesWon: 6, slot2GamesWon: 4 },
        { slot1GamesWon: null, slot2GamesWon: null },
      ]),
      "6-4",
    );
    assert.equal(
      groupHomeSetScoreLine([{ slot1GamesWon: null, slot2GamesWon: null }]),
      null,
    );
  });
});
