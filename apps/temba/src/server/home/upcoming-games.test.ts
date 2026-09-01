import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterAndSortMyGroupsHubGames,
  filterAndSortPublicHubGames,
  isMyGroupsHubGame,
  isPublicHubGame,
  type GameListCandidate,
  type PublicHubListCandidate,
} from "./upcoming-games.ts";

const NOW = new Date("2026-08-31T16:00:00.000Z");
const MEMBER_GROUP = "11111111-1111-4111-8111-111111111111";
const OTHER_GROUP = "22222222-2222-4222-8222-222222222222";
const memberGroupIds = new Set([MEMBER_GROUP]);

function candidate(
  overrides: Partial<GameListCandidate> & Pick<GameListCandidate, "id">,
): GameListCandidate {
  return {
    groupId: MEMBER_GROUP,
    cancelledAt: null,
    windowStart: new Date("2026-09-01T18:00:00.000Z"),
    windowEnd: new Date("2026-09-01T20:00:00.000Z"),
    createdAt: new Date("2026-08-01T12:00:00.000Z"),
    format: "friendly_game",
    matches: [],
    ...overrides,
  };
}

function publicCandidate(
  overrides: Partial<PublicHubListCandidate> &
    Pick<PublicHubListCandidate, "id">,
): PublicHubListCandidate {
  return {
    ...candidate(overrides),
    isPublic: true,
    communityArchivedAt: null,
    ...overrides,
  };
}

describe("My Groups hub list", () => {
  it("includes live upcoming Games on Groups the User belongs to", () => {
    const game = candidate({ id: "member-live" });
    assert.equal(isMyGroupsHubGame(game, memberGroupIds, NOW), true);
  });

  it("excludes Club Group Games when the User is not a Group member", () => {
    const game = candidate({
      id: "community-only",
      groupId: OTHER_GROUP,
    });
    assert.equal(isMyGroupsHubGame(game, memberGroupIds, NOW), false);
  });

  it("includes Soft-archived Club Group Games the User is a member of", () => {
    const game = publicCandidate({
      id: "archived-member",
      communityArchivedAt: new Date("2026-08-15T00:00:00.000Z"),
    });
    assert.equal(isMyGroupsHubGame(game, memberGroupIds, NOW), true);
  });

  it("excludes non-live Games", () => {
    const game = candidate({
      id: "ended",
      windowStart: new Date("2026-08-01T18:00:00.000Z"),
      windowEnd: new Date("2026-08-01T20:00:00.000Z"),
      matches: [
        {
          startTime: new Date("2026-08-01T18:00:00.000Z"),
          status: "completed",
        },
      ],
    });
    assert.equal(isMyGroupsHubGame(game, memberGroupIds, NOW), false);
  });

  it("excludes groupless Games from My Groups", () => {
    const game = candidate({ id: "groupless", groupId: null });
    assert.equal(isMyGroupsHubGame(game, memberGroupIds, NOW), false);
  });

  it("sorts My Groups soonest first", () => {
    const later = candidate({
      id: "later",
      windowStart: new Date("2026-09-03T18:00:00.000Z"),
      windowEnd: new Date("2026-09-03T20:00:00.000Z"),
    });
    const sooner = candidate({
      id: "sooner",
      windowStart: new Date("2026-09-02T18:00:00.000Z"),
      windowEnd: new Date("2026-09-02T20:00:00.000Z"),
    });
    const sorted = filterAndSortMyGroupsHubGames(
      [later, sooner],
      memberGroupIds,
      NOW,
    );
    assert.deepEqual(
      sorted.map((game) => game.id),
      ["sooner", "later"],
    );
  });
});

describe("Public hub list", () => {
  it("includes live public Games, including groupless", () => {
    const grouped = publicCandidate({
      id: "public-other-group",
      groupId: OTHER_GROUP,
    });
    const groupless = publicCandidate({
      id: "public-groupless",
      groupId: null,
    });
    assert.equal(isPublicHubGame(grouped, memberGroupIds, NOW), true);
    assert.equal(isPublicHubGame(groupless, memberGroupIds, NOW), true);
  });

  it("excludes Soft-archived Club Group public Games", () => {
    const game = publicCandidate({
      id: "archived-public",
      groupId: OTHER_GROUP,
      communityArchivedAt: new Date("2026-08-15T00:00:00.000Z"),
    });
    assert.equal(isPublicHubGame(game, memberGroupIds, NOW), false);
  });

  it("excludes public Games already listed on My Groups (My preferred)", () => {
    const game = publicCandidate({
      id: "member-public",
      groupId: MEMBER_GROUP,
    });
    assert.equal(isMyGroupsHubGame(game, memberGroupIds, NOW), true);
    assert.equal(isPublicHubGame(game, memberGroupIds, NOW), false);
  });

  it("excludes non-live public Games", () => {
    const game = publicCandidate({
      id: "ended-public",
      groupId: OTHER_GROUP,
      windowStart: new Date("2026-08-01T18:00:00.000Z"),
      windowEnd: new Date("2026-08-01T20:00:00.000Z"),
      matches: [],
    });
    assert.equal(isPublicHubGame(game, memberGroupIds, NOW), false);
  });

  it("excludes non-public Games", () => {
    const game = publicCandidate({
      id: "private",
      groupId: OTHER_GROUP,
      isPublic: false,
    });
    assert.equal(isPublicHubGame(game, memberGroupIds, NOW), false);
  });

  it("sorts Public soonest first and drops member-Group duplicates", () => {
    const mine = publicCandidate({ id: "mine", groupId: MEMBER_GROUP });
    const later = publicCandidate({
      id: "later-public",
      groupId: OTHER_GROUP,
      windowStart: new Date("2026-09-03T18:00:00.000Z"),
      windowEnd: new Date("2026-09-03T20:00:00.000Z"),
    });
    const sooner = publicCandidate({
      id: "sooner-public",
      groupId: null,
      windowStart: new Date("2026-09-02T18:00:00.000Z"),
      windowEnd: new Date("2026-09-02T20:00:00.000Z"),
    });
    const sorted = filterAndSortPublicHubGames(
      [later, mine, sooner],
      memberGroupIds,
      NOW,
    );
    assert.deepEqual(
      sorted.map((game) => game.id),
      ["sooner-public", "later-public"],
    );
  });
});
