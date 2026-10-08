import { describe, expect, it } from "vitest";

import {
  groupMemberRowsLink,
  overallView,
  playerHeaderSubtitle,
} from "./player-profile";
import { createPlayerProfileFixtures } from "./player-profile-fixtures";

const fixtures = createPlayerProfileFixtures();

describe("playerHeaderSubtitle", () => {
  it("names the usual Venue", () => {
    expect(playerHeaderSubtitle(fixtures.confirmed.venue)).toBe(
      "Padel, plays at Padelhuset Bromma",
    );
  });

  it("reads Padel without one", () => {
    expect(playerHeaderSubtitle(fixtures.newPlayer.venue)).toBe("Padel");
  });
});

describe("overallView", () => {
  it("shows four All time tiles", () => {
    expect(overallView(fixtures.confirmed.overall)).toEqual({
      title: "Overall",
      scope: "All time",
      tiles: [
        { label: "Matches", value: "64" },
        { label: "Won", value: "41" },
        { label: "Win rate", value: "64%" },
        { label: "Sets won", value: "61%" },
      ],
    });
  });

  it("shows zeros and dashes before the first Match", () => {
    expect(overallView(fixtures.newPlayer.overall).tiles).toEqual([
      { label: "Matches", value: "0" },
      { label: "Won", value: "0" },
      { label: "Win rate", value: "—" },
      { label: "Sets won", value: "—" },
    ]);
  });

  it("counts a draw as played", () => {
    const tiles = overallView({
      played: 2,
      won: 1,
      lost: 0,
      drawn: 1,
      setsWon: 3,
      setsPlayed: 4,
    }).tiles;
    expect(tiles[2]).toEqual({ label: "Win rate", value: "50%" });
    expect(tiles[3]).toEqual({ label: "Sets won", value: "75%" });
  });
});

describe("groupMemberRowsLink", () => {
  it("links member rows for a Group member", () => {
    expect(groupMemberRowsLink({ role: "member" })).toBe(true);
  });

  it("leaves rows unlinked for a non-member previewing a Public Group", () => {
    expect(groupMemberRowsLink(null)).toBe(false);
    expect(groupMemberRowsLink(undefined)).toBe(false);
  });
});
