import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  filterGroupMembersByName,
  groupHomeHasStandingResults,
  groupHomeMetaLine,
  groupHomeSetScoreLine,
  groupHomeShowsMemberSearch,
  groupHomeSportLabel,
  groupHomeVenueCourtLine,
  groupMemberRoleCaption,
  groupStandingRecordLabel,
} from "./group-home-chrome";

describe("groupHomeSportLabel", () => {
  it("maps padel and football to display labels", () => {
    assert.equal(groupHomeSportLabel("padel"), "Padel");
    assert.equal(groupHomeSportLabel("football"), "Football");
  });
});

describe("groupHomeMetaLine", () => {
  it("joins Sport, members, and the season month when every part is present", () => {
    assert.equal(
      groupHomeMetaLine({
        sport: "padel",
        memberCount: 14,
        createdAt: new Date("2024-01-15T12:00:00Z"),
      }),
      "Padel, 14 members, season since Jan",
    );
  });

  it("drops the Sport when the Group has none", () => {
    assert.equal(
      groupHomeMetaLine({
        sport: null,
        memberCount: 14,
        createdAt: new Date("2024-01-15T12:00:00Z"),
      }),
      "14 members, season since Jan",
    );
  });

  it("drops the member count when it is missing", () => {
    assert.equal(
      groupHomeMetaLine({
        sport: "football",
        memberCount: null,
        createdAt: new Date("2024-09-15T12:00:00Z"),
      }),
      "Football, season since Sep",
    );
  });

  it("pluralises a single member and drops the season with no createdAt", () => {
    assert.equal(
      groupHomeMetaLine({
        sport: "padel",
        memberCount: 1,
        createdAt: null,
      }),
      "Padel, 1 member",
    );
  });

  it("returns an empty string when nothing is known", () => {
    assert.equal(
      groupHomeMetaLine({
        sport: null,
        memberCount: null,
        createdAt: null,
      }),
      "",
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

describe("groupMemberRoleCaption", () => {
  it("reads Organizer for the creator and Community staff", () => {
    assert.equal(
      groupMemberRoleCaption({
        isOrganizer: true,
        joinedAt: new Date("2024-02-10T12:00:00Z"),
      }),
      "Organizer",
    );
  });

  it("falls back to the join month for everyone else", () => {
    assert.equal(
      groupMemberRoleCaption({
        isOrganizer: false,
        joinedAt: new Date("2024-02-10T12:00:00Z"),
      }),
      "Member since Feb",
    );
  });

  it("returns null when neither role nor join date is known", () => {
    assert.equal(
      groupMemberRoleCaption({ isOrganizer: false, joinedAt: null }),
      null,
    );
  });
});

describe("groupStandingRecordLabel", () => {
  it("draws the W-L pair, zero included", () => {
    assert.equal(groupStandingRecordLabel(18, 6), "18-6");
    assert.equal(groupStandingRecordLabel(0, 0), "0-0");
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
