import { describe, expect, it } from "vitest";

import { createGroupFixtures } from "./group-fixtures";
import { groupHomeHasStandingResults } from "./group-home-chrome";

describe("createGroupFixtures", () => {
  const fixtures = createGroupFixtures(new Date("2026-03-10T12:00:00Z"));

  it("covers every join mode on the public list", () => {
    expect(fixtures.publicGroups.map((group) => group.joinMode)).toEqual([
      "join",
      "request",
      "requested",
    ]);
  });

  it("orders each leaderboard by position", () => {
    for (const home of Object.values(fixtures.home)) {
      expect(home.standing.leaderboard.map((row) => row.position)).toEqual(
        home.standing.leaderboard.map((_, index) => index + 1),
      );
    }
  });

  it("draws the empty-results state from members with no games", () => {
    expect(
      groupHomeHasStandingResults(fixtures.home.noResults.standing.leaderboard),
    ).toBe(false);
    expect(
      groupHomeHasStandingResults(fixtures.home.member.standing.leaderboard),
    ).toBe(true);
  });

  it("keeps the viewer on the leaderboard only for a member", () => {
    expect(fixtures.home.member.membership).not.toBeNull();
    expect(fixtures.home.nonMemberJoin.membership).toBeNull();
  });

  it("lists Games that are not tournament Match rows", () => {
    expect(fixtures.home.member.upcomingGames.length).toBeGreaterThan(0);
    expect(
      fixtures.home.member.upcomingGames.every((game) => game.matchId === null),
    ).toBe(true);
  });
});

describe("administration fixtures", () => {
  const fixtures = createGroupFixtures(new Date("2026-03-10T12:00:00Z"));

  it("offers Delete only where the server allows it", () => {
    expect(fixtures.administration.creator.canDelete).toBe(false);
    expect(fixtures.administration.deletable.canDelete).toBe(true);
    expect(fixtures.administration.member.canDelete).toBe(false);
  });

  it("gives a Private Group no approval controls", () => {
    expect(fixtures.administration.private.canSetRequiresApproval).toBe(false);
    expect(fixtures.administration.private.canDecideJoinRequests).toBe(false);
  });

  it("flags a requester who is not yet a Community Member", () => {
    expect(
      fixtures.joinRequests.map((request) => request.isCommunityMember),
    ).toEqual([null, false]);
  });
});
