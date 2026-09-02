import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  filterAndSortMyGamesHubGames,
  filterAndSortPublicHubGames,
  isMyGamesHubGame,
  isPublicHubGame,
  type GameListCandidate,
  type MyGamesHubListCandidate,
  type PublicHubListCandidate,
} from "./upcoming-games";

const NOW = new Date("2026-08-31T16:00:00.000Z");
const MEMBER_GROUP = "11111111-1111-4111-8111-111111111111";
const OTHER_GROUP = "22222222-2222-4222-8222-222222222222";
const VIEWER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_USER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
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

function myGamesCandidate(
  overrides: Partial<MyGamesHubListCandidate> &
    Pick<MyGamesHubListCandidate, "id">,
): MyGamesHubListCandidate {
  return {
    ...candidate(overrides),
    isPublic: false,
    createdBy: OTHER_USER,
    viewerIsParticipant: false,
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

describe("My Games hub list", () => {
  it("includes live upcoming Games on Groups the User belongs to", () => {
    const game = myGamesCandidate({ id: "member-live" });
    assert.equal(isMyGamesHubGame(game, memberGroupIds, VIEWER_ID, NOW), true);
  });

  it("excludes Club Group Games when the User is not a Group member", () => {
    const game = myGamesCandidate({
      id: "community-only",
      groupId: OTHER_GROUP,
    });
    assert.equal(isMyGamesHubGame(game, memberGroupIds, VIEWER_ID, NOW), false);
  });

  it("includes Soft-archived Club Group Games the User is a member of", () => {
    const game = myGamesCandidate({
      id: "archived-member",
      isPublic: true,
    });
    assert.equal(isMyGamesHubGame(game, memberGroupIds, VIEWER_ID, NOW), true);
  });

  it("excludes non-live Games", () => {
    const game = myGamesCandidate({
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
    assert.equal(isMyGamesHubGame(game, memberGroupIds, VIEWER_ID, NOW), false);
  });

  it("excludes public groupless Games from My Games", () => {
    const game = myGamesCandidate({
      id: "groupless-public",
      groupId: null,
      isPublic: true,
      createdBy: VIEWER_ID,
    });
    assert.equal(isMyGamesHubGame(game, memberGroupIds, VIEWER_ID, NOW), false);
  });

  it("includes private groupless Games the User created", () => {
    const game = myGamesCandidate({
      id: "private-created",
      groupId: null,
      createdBy: VIEWER_ID,
    });
    assert.equal(isMyGamesHubGame(game, memberGroupIds, VIEWER_ID, NOW), true);
  });

  it("includes private Games the User created on a Group they do not belong to", () => {
    const game = myGamesCandidate({
      id: "private-created-other-group",
      groupId: OTHER_GROUP,
      createdBy: VIEWER_ID,
    });
    assert.equal(isMyGamesHubGame(game, memberGroupIds, VIEWER_ID, NOW), true);
  });

  it("includes private Games the User is registered or waitlisted on", () => {
    const registered = myGamesCandidate({
      id: "private-registered",
      groupId: null,
      viewerIsParticipant: true,
    });
    assert.equal(
      isMyGamesHubGame(registered, memberGroupIds, VIEWER_ID, NOW),
      true,
    );
  });

  it("excludes private Games the User did not create and is not part of", () => {
    const game = myGamesCandidate({
      id: "private-stranger",
      groupId: null,
    });
    assert.equal(isMyGamesHubGame(game, memberGroupIds, VIEWER_ID, NOW), false);
  });

  it("excludes public Games the User is part of when they are not a Group member", () => {
    const game = myGamesCandidate({
      id: "public-participant",
      groupId: null,
      isPublic: true,
      viewerIsParticipant: true,
    });
    assert.equal(isMyGamesHubGame(game, memberGroupIds, VIEWER_ID, NOW), false);
  });

  it("sorts My Games soonest first", () => {
    const later = myGamesCandidate({
      id: "later",
      windowStart: new Date("2026-09-03T18:00:00.000Z"),
      windowEnd: new Date("2026-09-03T20:00:00.000Z"),
    });
    const sooner = myGamesCandidate({
      id: "sooner",
      windowStart: new Date("2026-09-02T18:00:00.000Z"),
      windowEnd: new Date("2026-09-02T20:00:00.000Z"),
    });
    const sorted = filterAndSortMyGamesHubGames(
      [later, sooner],
      memberGroupIds,
      VIEWER_ID,
      NOW,
    );
    assert.deepEqual(
      sorted.map((game) => game.id),
      ["sooner", "later"],
    );
  });

  it("sorts joined Games before Games the User has not joined, then by soonest", () => {
    const laterJoined = myGamesCandidate({
      id: "later-joined",
      windowStart: new Date("2026-09-03T18:00:00.000Z"),
      windowEnd: new Date("2026-09-03T20:00:00.000Z"),
      viewerIsParticipant: true,
    });
    const soonerOpen = myGamesCandidate({
      id: "sooner-open",
      windowStart: new Date("2026-09-02T18:00:00.000Z"),
      windowEnd: new Date("2026-09-02T20:00:00.000Z"),
      viewerIsParticipant: false,
    });
    const soonerJoined = myGamesCandidate({
      id: "sooner-joined",
      windowStart: new Date("2026-09-02T12:00:00.000Z"),
      windowEnd: new Date("2026-09-02T14:00:00.000Z"),
      viewerIsParticipant: true,
    });
    const sorted = filterAndSortMyGamesHubGames(
      [soonerOpen, laterJoined, soonerJoined],
      memberGroupIds,
      VIEWER_ID,
      NOW,
    );
    assert.deepEqual(
      sorted.map((game) => game.id),
      ["sooner-joined", "later-joined", "sooner-open"],
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

  it("excludes public Games already listed on My Games (My preferred)", () => {
    const game = publicCandidate({
      id: "member-public",
      groupId: MEMBER_GROUP,
    });
    assert.equal(
      isMyGamesHubGame(
        myGamesCandidate({
          id: game.id,
          groupId: MEMBER_GROUP,
          isPublic: true,
        }),
        memberGroupIds,
        VIEWER_ID,
        NOW,
      ),
      true,
    );
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
