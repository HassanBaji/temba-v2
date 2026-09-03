import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  CommunityRoleEnum,
  GameFormatEnum,
  GameRegistrationModeEnum,
  MatchStatusEnum,
  communities,
  communityMembers,
  gamePlayers,
  gameWaitlist,
  games,
  groupMembers,
  groups,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { listMyGamesHubRows } from "~/server/games/hub-list-rows";
import { home } from "~/server/home/home";
import { commit } from "~/server/soft-archive";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";
import {
  filterAndSortHomeCarouselGames,
  homeCarouselPhase,
  isHomeCarouselGame,
  listHomeCarouselGames,
  type HomeCarouselCandidate,
} from "./carousel-games";
import {
  isGameLive,
  isMyGamesHubGame,
  type GameListCandidate,
} from "./upcoming-games";

const NOW = new Date("2026-08-31T16:00:00.000Z");
const VIEWER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_USER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_GROUP = "11111111-1111-4111-8111-111111111111";

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

function carouselCandidate(
  overrides: Partial<HomeCarouselCandidate> & Pick<HomeCarouselCandidate, "id">,
): HomeCarouselCandidate {
  return {
    ...candidate(overrides),
    createdBy: OTHER_USER,
    viewerHasGameAdmit: false,
    viewerIsOrganizer: false,
    ...overrides,
  };
}

describe("Home carousel audience and live window", () => {
  it("includes live Games the User has Game admit on", () => {
    const game = carouselCandidate({
      id: "admitted",
      viewerHasGameAdmit: true,
    });
    expect(isHomeCarouselGame(game, NOW)).toBe(true);
    expect(homeCarouselPhase(game, NOW)).toBe("upcoming");
  });

  it("includes public pickup the User joined", () => {
    const game = carouselCandidate({
      id: "public-joined",
      groupId: null,
      viewerHasGameAdmit: true,
    });
    expect(isHomeCarouselGame(game, NOW)).toBe(true);
  });

  it("includes Organizer Games they did not sit on", () => {
    const game = carouselCandidate({
      id: "organizer-empty",
      createdBy: VIEWER_ID,
      viewerIsOrganizer: true,
      viewerHasGameAdmit: false,
    });
    expect(isHomeCarouselGame(game, NOW)).toBe(true);
  });

  it("excludes waitlisted-only Users", () => {
    const game = carouselCandidate({
      id: "waitlisted",
      viewerHasGameAdmit: false,
      viewerIsOrganizer: false,
    });
    expect(isHomeCarouselGame(game, NOW)).toBe(false);
  });

  it("excludes unjoined Group members", () => {
    const game = carouselCandidate({
      id: "group-spectator",
      groupId: MEMBER_GROUP,
    });
    expect(isHomeCarouselGame(game, NOW)).toBe(false);
  });

  it("excludes cancelled Games", () => {
    const game = carouselCandidate({
      id: "cancelled",
      cancelledAt: NOW,
      viewerHasGameAdmit: true,
    });
    expect(isHomeCarouselGame(game, NOW)).toBe(false);
    expect(isGameLive(game, NOW)).toBe(false);
  });

  it("treats before-window Games as upcoming", () => {
    const game = carouselCandidate({
      id: "upcoming",
      viewerHasGameAdmit: true,
      windowStart: new Date("2026-09-01T18:00:00.000Z"),
      windowEnd: new Date("2026-09-01T20:00:00.000Z"),
    });
    expect(homeCarouselPhase(game, NOW)).toBe("upcoming");
    expect(isHomeCarouselGame(game, NOW)).toBe(true);
  });

  it("treats in-window Games as ongoing", () => {
    const game = carouselCandidate({
      id: "ongoing",
      viewerHasGameAdmit: true,
      windowStart: new Date("2026-08-31T15:00:00.000Z"),
      windowEnd: new Date("2026-08-31T18:00:00.000Z"),
    });
    expect(homeCarouselPhase(game, NOW)).toBe("ongoing");
    expect(isHomeCarouselGame(game, NOW)).toBe(true);
  });

  it("excludes Games after the live window", () => {
    const game = carouselCandidate({
      id: "finished",
      viewerHasGameAdmit: true,
      windowStart: new Date("2026-08-01T18:00:00.000Z"),
      windowEnd: new Date("2026-08-01T20:00:00.000Z"),
      matches: [
        {
          startTime: new Date("2026-08-01T18:00:00.000Z"),
          status: "completed",
        },
      ],
    });
    expect(isGameLive(game, NOW)).toBe(false);
    expect(isHomeCarouselGame(game, NOW)).toBe(false);
    expect(homeCarouselPhase(game, NOW)).toBeNull();
  });

  it("returns every matching live Game, ongoing before upcoming, soonest first", () => {
    const laterUpcoming = carouselCandidate({
      id: "later-upcoming",
      viewerHasGameAdmit: true,
      windowStart: new Date("2026-09-03T18:00:00.000Z"),
      windowEnd: new Date("2026-09-03T20:00:00.000Z"),
    });
    const soonerUpcoming = carouselCandidate({
      id: "sooner-upcoming",
      viewerHasGameAdmit: true,
      windowStart: new Date("2026-09-02T18:00:00.000Z"),
      windowEnd: new Date("2026-09-02T20:00:00.000Z"),
    });
    const ongoing = carouselCandidate({
      id: "ongoing",
      viewerHasGameAdmit: true,
      windowStart: new Date("2026-08-31T15:00:00.000Z"),
      windowEnd: new Date("2026-08-31T18:00:00.000Z"),
    });
    const spectator = carouselCandidate({ id: "spectator" });
    const fifth = carouselCandidate({
      id: "fifth-upcoming",
      viewerHasGameAdmit: true,
      windowStart: new Date("2026-09-04T18:00:00.000Z"),
      windowEnd: new Date("2026-09-04T20:00:00.000Z"),
    });
    const fourth = carouselCandidate({
      id: "fourth-upcoming",
      viewerHasGameAdmit: true,
      windowStart: new Date("2026-09-03T12:00:00.000Z"),
      windowEnd: new Date("2026-09-03T14:00:00.000Z"),
    });
    const sorted = filterAndSortHomeCarouselGames(
      [laterUpcoming, spectator, fifth, ongoing, soonerUpcoming, fourth],
      NOW,
    );
    expect(sorted.map((game) => game.id)).toEqual([
      "ongoing",
      "sooner-upcoming",
      "fourth-upcoming",
      "later-upcoming",
      "fifth-upcoming",
    ]);
  });

  it("does not change the Games hub My Groups membership filter", () => {
    const unjoinedGroupGame = {
      ...candidate({ id: "member-unjoined" }),
      isPublic: false,
      createdBy: OTHER_USER,
      viewerIsParticipant: false,
    };
    expect(
      isMyGamesHubGame(
        unjoinedGroupGame,
        new Set([MEMBER_GROUP]),
        VIEWER_ID,
        NOW,
      ),
    ).toBe(true);
    expect(
      isHomeCarouselGame(carouselCandidate({ id: "member-unjoined" }), NOW),
    ).toBe(false);
  });
});

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "Test User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertGroup(
  database: TestDatabase,
  createdBy: string,
  communityId?: string,
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: `Group ${crypto.randomUUID()}`,
      createdBy,
      communityId,
    })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function insertGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    isPublic?: boolean;
    groupId?: string | null;
    windowStart?: Date;
    windowEnd?: Date;
    cancelledAt?: Date | null;
  },
) {
  const [row] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      createdBy: args.createdBy,
      groupId: args.groupId ?? null,
      isPublic: args.isPublic ?? false,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart: args.windowStart ?? new Date("2026-09-01T18:00:00.000Z"),
      windowEnd: args.windowEnd ?? new Date("2026-09-01T20:00:00.000Z"),
      cancelledAt: args.cancelledAt ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert game");
  }
  await database.insert(matches).values({ gameId: row.id });
  return row;
}

async function completeInsertedMatch(database: TestDatabase, gameId: string) {
  await database
    .update(matches)
    .set({
      status: MatchStatusEnum.COMPLETED,
      startTime: new Date("2026-08-01T18:00:00.000Z"),
    })
    .where(eq(matches.gameId, gameId));
}

describe("Home carousel list", () => {
  it("lists admitted and organizer Games and drops waitlisted, spectators, cancelled, and finished", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "carousel-viewer@example.com");
      const other = await insertUser(db, "carousel-other@example.com");
      const venue = await insertVenue(db);
      const memberGroup = await insertGroup(db, other.id);
      await db.insert(groupMembers).values({
        groupId: memberGroup.id,
        userId: viewer.id,
      });

      const admitted = await insertGame(db, {
        createdBy: other.id,
        venueId: venue.id,
      });
      await db.insert(gamePlayers).values({
        gameId: admitted.id,
        userId: viewer.id,
      });

      const publicJoined = await insertGame(db, {
        createdBy: other.id,
        venueId: venue.id,
        isPublic: true,
      });
      await db.insert(gamePlayers).values({
        gameId: publicJoined.id,
        userId: viewer.id,
      });

      const organizerEmpty = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
      });

      const waitlisted = await insertGame(db, {
        createdBy: other.id,
        venueId: venue.id,
      });
      await db.insert(gameWaitlist).values({
        gameId: waitlisted.id,
        userId: viewer.id,
      });

      const spectatorGroupGame = await insertGame(db, {
        createdBy: other.id,
        venueId: venue.id,
        groupId: memberGroup.id,
      });

      const cancelled = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        cancelledAt: NOW,
      });

      const finished = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        windowStart: new Date("2026-08-01T18:00:00.000Z"),
        windowEnd: new Date("2026-08-01T20:00:00.000Z"),
      });
      await completeInsertedMatch(db, finished.id);

      const rows = await listHomeCarouselGames(db, viewer.id, NOW);
      const ids = rows.map((row) => row.id);

      expect(ids).toEqual(
        expect.arrayContaining([
          admitted.id,
          publicJoined.id,
          organizerEmpty.id,
        ]),
      );
      expect(ids).not.toContain(waitlisted.id);
      expect(ids).not.toContain(spectatorGroupGame.id);
      expect(ids).not.toContain(cancelled.id);
      expect(ids).not.toContain(finished.id);
      expect(rows.every((row) => row.phase === "upcoming")).toBe(true);

      const hubIds = (await listMyGamesHubRows(db, viewer.id, NOW)).map(
        (row) => row.id,
      );
      expect(hubIds).toContain(spectatorGroupGame.id);
      expect(hubIds).toContain(waitlisted.id);
    } finally {
      await close();
    }
  });

  it("keeps Soft-archived Club Group Games when the viewer still qualifies", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "archive-owner@example.com");
      const viewer = await insertUser(db, "archive-player@example.com");
      const venue = await insertVenue(db);
      const [community] = await db
        .insert(communities)
        .values({
          name: "Archived Club",
          type: "private",
          createdBy: owner.id,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      await db.insert(communityMembers).values({
        communityId: community.id,
        userId: owner.id,
        role: CommunityRoleEnum.OWNER,
      });
      const clubGroup = await insertGroup(db, owner.id, community.id);
      await db.insert(groupMembers).values([
        { groupId: clubGroup.id, userId: owner.id },
        { groupId: clubGroup.id, userId: viewer.id },
      ]);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        groupId: clubGroup.id,
      });
      await db.insert(gamePlayers).values({
        gameId: game.id,
        userId: viewer.id,
      });
      await commit(db, { communityId: community.id }, "archived");

      const rows = await listHomeCarouselGames(db, viewer.id, NOW);
      expect(rows.map((row) => row.id)).toEqual([game.id]);
    } finally {
      await close();
    }
  });

  it("includes Club Group Games a Community Owner organizes but did not sit on", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "club-owner@example.com");
      const creator = await insertUser(db, "club-creator@example.com");
      const venue = await insertVenue(db);
      const [community] = await db
        .insert(communities)
        .values({
          name: "Live Club",
          type: "private",
          createdBy: owner.id,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      await db.insert(communityMembers).values([
        {
          communityId: community.id,
          userId: owner.id,
          role: CommunityRoleEnum.OWNER,
        },
        {
          communityId: community.id,
          userId: creator.id,
          role: CommunityRoleEnum.MEMBER,
        },
      ]);
      const clubGroup = await insertGroup(db, creator.id, community.id);
      const game = await insertGame(db, {
        createdBy: creator.id,
        venueId: venue.id,
        groupId: clubGroup.id,
      });

      const rows = await listHomeCarouselGames(db, owner.id, NOW);
      expect(rows.map((row) => row.id)).toEqual([game.id]);
    } finally {
      await close();
    }
  });

  it("returns more than four matching Games with no cap", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "uncapped@example.com");
      const venue = await insertVenue(db);
      const created = [];
      for (let index = 0; index < 5; index += 1) {
        created.push(
          await insertGame(db, {
            createdBy: viewer.id,
            venueId: venue.id,
            windowStart: new Date(`2026-09-0${index + 1}T18:00:00.000Z`),
            windowEnd: new Date(`2026-09-0${index + 1}T20:00:00.000Z`),
          }),
        );
      }

      const rows = await listHomeCarouselGames(db, viewer.id, NOW);
      expect(rows).toHaveLength(5);
      expect(rows.map((row) => row.id)).toEqual(created.map((game) => game.id));
    } finally {
      await close();
    }
  });

  it("wires Home to the dedicated carousel list and leaves stats at completed-Match zeros", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "home-wire@example.com");
      const other = await insertUser(db, "home-wire-other@example.com");
      const venue = await insertVenue(db);
      const memberGroup = await insertGroup(db, other.id);
      await db.insert(groupMembers).values({
        groupId: memberGroup.id,
        userId: viewer.id,
      });
      const spectatorGame = await insertGame(db, {
        createdBy: other.id,
        venueId: venue.id,
        groupId: memberGroup.id,
        windowStart: new Date("2099-01-01T18:00:00.000Z"),
        windowEnd: new Date("2099-01-01T20:00:00.000Z"),
      });
      const joined = await insertGame(db, {
        createdBy: other.id,
        venueId: venue.id,
        isPublic: true,
        windowStart: new Date("2099-01-01T18:00:00.000Z"),
        windowEnd: new Date("2099-01-01T20:00:00.000Z"),
      });
      await db.insert(gamePlayers).values({
        gameId: joined.id,
        userId: viewer.id,
      });

      const result = await home(db, { userId: viewer.id });
      expect(result.carouselGames.map((game) => game.id)).toEqual([joined.id]);
      expect(result.carouselGames[0]?.phase).toBe("upcoming");
      expect(result.gamesPlayed).toBe(0);
      expect(result.gamesWon).toBe(0);
      expect(result.setsWon).toBe(0);

      const hubIds = (await listMyGamesHubRows(db, viewer.id, NOW)).map(
        (row) => row.id,
      );
      expect(hubIds).toContain(spectatorGame.id);
      expect(hubIds).not.toContain(joined.id);
    } finally {
      await close();
    }
  });
});
