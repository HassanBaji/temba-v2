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
import { admit } from "~/server/games/admit";
import { home } from "~/server/home/home";
import { commit } from "~/server/soft-archive";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";
import {
  filterAndSortHomeCarouselGames,
  homeCarouselPhase,
  isHomeCarouselAtCap,
  isHomeCarouselGame,
  isHomeCarouselNeedsResults,
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
    registrationMode: "individual",
    playersAllowed: 4,
    teamsAllowed: 2,
    registeredUserCount: 0,
    registeredTeamCount: 0,
    ...overrides,
  };
}

function finishedUncompleted(
  overrides: Partial<HomeCarouselCandidate> & Pick<HomeCarouselCandidate, "id">,
): HomeCarouselCandidate {
  return carouselCandidate({
    windowStart: new Date("2026-08-01T18:00:00.000Z"),
    windowEnd: new Date("2026-08-01T20:00:00.000Z"),
    matches: [
      {
        startTime: new Date("2026-08-01T18:00:00.000Z"),
        status: "pending",
      },
    ],
    registeredUserCount: 4,
    viewerHasGameAdmit: true,
    ...overrides,
  });
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

  it("excludes Games after the live window when they are not needs-results", () => {
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

  it("retains finished at-cap Games with an uncompleted Match", () => {
    const game = finishedUncompleted({ id: "needs-results" });
    expect(isGameLive(game, NOW)).toBe(false);
    expect(homeCarouselPhase(game, NOW)).toBe("needs_results");
    expect(isHomeCarouselGame(game, NOW)).toBe(true);
  });

  it("drops finished at-cap Games once every remaining Match is completed", () => {
    const game = finishedUncompleted({
      id: "completed",
      matches: [
        {
          startTime: new Date("2026-08-01T18:00:00.000Z"),
          status: "completed",
        },
      ],
    });
    expect(isHomeCarouselGame(game, NOW)).toBe(false);
  });

  it("drops finished at-cap Games when the remaining Match is cancelled", () => {
    const game = finishedUncompleted({
      id: "match-cancelled",
      matches: [
        {
          startTime: new Date("2026-08-01T18:00:00.000Z"),
          status: "cancelled",
        },
      ],
    });
    expect(isHomeCarouselGame(game, NOW)).toBe(false);
  });

  it("drops finished Games under cap even with an uncompleted Match", () => {
    const game = finishedUncompleted({
      id: "under-cap",
      registeredUserCount: 3,
    });
    expect(isHomeCarouselGame(game, NOW)).toBe(false);
  });

  it("uses occupancy at cap, not registration status full", () => {
    const game = finishedUncompleted({
      id: "closed-but-full",
      registeredUserCount: 4,
    });
    expect(isHomeCarouselAtCap(game)).toBe(true);
    expect(isHomeCarouselNeedsResults(game, NOW)).toBe(true);
  });

  it("uses team occupancy for team-only Games", () => {
    const under = finishedUncompleted({
      id: "team-under",
      registrationMode: "team_only",
      registeredUserCount: 4,
      registeredTeamCount: 1,
    });
    const atCap = finishedUncompleted({
      id: "team-cap",
      registrationMode: "team_only",
      registeredUserCount: 2,
      registeredTeamCount: 2,
    });
    expect(isHomeCarouselGame(under, NOW)).toBe(false);
    expect(homeCarouselPhase(atCap, NOW)).toBe("needs_results");
  });

  it("does not retain Americano after the window", () => {
    const game = finishedUncompleted({
      id: "americano",
      format: "americano",
    });
    expect(isHomeCarouselGame(game, NOW)).toBe(false);
  });

  it("retains a Friendly tournament until every remaining Match is completed", () => {
    const game = finishedUncompleted({
      id: "tournament",
      format: "friendly_tournament",
      matches: [
        {
          startTime: new Date("2026-08-01T18:00:00.000Z"),
          status: "completed",
        },
        {
          startTime: new Date("2026-08-01T19:00:00.000Z"),
          status: "pending",
        },
      ],
    });
    expect(homeCarouselPhase(game, NOW)).toBe("needs_results");
    const done = finishedUncompleted({
      id: "tournament-done",
      format: "friendly_tournament",
      matches: [
        {
          startTime: new Date("2026-08-01T18:00:00.000Z"),
          status: "completed",
        },
        {
          startTime: new Date("2026-08-01T19:00:00.000Z"),
          status: "cancelled",
        },
      ],
    });
    expect(isHomeCarouselGame(done, NOW)).toBe(false);
  });

  it("orders needs-results (oldest first), then ongoing, then upcoming", () => {
    const olderNeeds = finishedUncompleted({
      id: "older-needs",
      windowStart: new Date("2026-07-01T18:00:00.000Z"),
      windowEnd: new Date("2026-07-01T20:00:00.000Z"),
    });
    const newerNeeds = finishedUncompleted({
      id: "newer-needs",
      windowStart: new Date("2026-08-01T18:00:00.000Z"),
      windowEnd: new Date("2026-08-01T20:00:00.000Z"),
    });
    const ongoing = carouselCandidate({
      id: "ongoing",
      viewerHasGameAdmit: true,
      windowStart: new Date("2026-08-31T15:00:00.000Z"),
      windowEnd: new Date("2026-08-31T18:00:00.000Z"),
    });
    const upcoming = carouselCandidate({
      id: "upcoming",
      viewerHasGameAdmit: true,
    });
    const sorted = filterAndSortHomeCarouselGames(
      [upcoming, newerNeeds, ongoing, olderNeeds],
      NOW,
    );
    expect(sorted.map((game) => game.id)).toEqual([
      "older-needs",
      "newer-needs",
      "ongoing",
      "upcoming",
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
    format?: (typeof GameFormatEnum)[keyof typeof GameFormatEnum];
    windowStart?: Date;
    windowEnd?: Date;
    cancelledAt?: Date | null;
  },
) {
  const [row] = await database
    .insert(games)
    .values({
      format: args.format ?? GameFormatEnum.FRIENDLY_GAME,
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

async function expireInsertedMatch(database: TestDatabase, gameId: string) {
  await database
    .update(matches)
    .set({
      startTime: new Date("2026-08-01T18:00:00.000Z"),
    })
    .where(eq(matches.gameId, gameId));
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

const PAST_WINDOW = {
  windowStart: new Date("2026-08-01T18:00:00.000Z"),
  windowEnd: new Date("2026-08-01T20:00:00.000Z"),
};

async function insertFinishedGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    isPublic?: boolean;
    groupId?: string | null;
    format?: (typeof GameFormatEnum)[keyof typeof GameFormatEnum];
  },
) {
  const game = await insertGame(database, {
    ...args,
    ...PAST_WINDOW,
  });
  await expireInsertedMatch(database, game.id);
  return game;
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

  it("retains finished at-cap Games and drops completed, under-cap, Americano, waitlisted, and spectators", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "needs-viewer@example.com");
      const other = await insertUser(db, "needs-other@example.com");
      const extras = await Promise.all([
        insertUser(db, "needs-p2@example.com"),
        insertUser(db, "needs-p3@example.com"),
        insertUser(db, "needs-p4@example.com"),
      ]);
      const venue = await insertVenue(db);
      const memberGroup = await insertGroup(db, other.id);
      await db.insert(groupMembers).values({
        groupId: memberGroup.id,
        userId: viewer.id,
      });

      const atCap = await insertFinishedGame(db, {
        createdBy: other.id,
        venueId: venue.id,
        isPublic: true,
      });
      await db.insert(gamePlayers).values(
        [viewer.id, other.id, extras[0]!.id, extras[1]!.id].map((userId) => ({
          gameId: atCap.id,
          userId,
        })),
      );

      const completed = await insertFinishedGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
      });
      await db.insert(gamePlayers).values(
        [viewer.id, other.id, extras[0]!.id, extras[1]!.id].map((userId) => ({
          gameId: completed.id,
          userId,
        })),
      );
      await completeInsertedMatch(db, completed.id);

      const underCap = await insertFinishedGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
      });
      await db.insert(gamePlayers).values({
        gameId: underCap.id,
        userId: viewer.id,
      });

      const americano = await insertFinishedGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        format: GameFormatEnum.AMERICANO,
      });
      await db.insert(gamePlayers).values(
        [viewer.id, other.id, extras[0]!.id, extras[1]!.id].map((userId) => ({
          gameId: americano.id,
          userId,
        })),
      );

      const waitlisted = await insertFinishedGame(db, {
        createdBy: other.id,
        venueId: venue.id,
      });
      await db.insert(gameWaitlist).values({
        gameId: waitlisted.id,
        userId: viewer.id,
      });
      await db.insert(gamePlayers).values(
        [other.id, extras[0]!.id, extras[1]!.id, extras[2]!.id].map(
          (userId) => ({
            gameId: waitlisted.id,
            userId,
          }),
        ),
      );

      const spectator = await insertFinishedGame(db, {
        createdBy: other.id,
        venueId: venue.id,
        groupId: memberGroup.id,
      });
      await db.insert(gamePlayers).values(
        [other.id, extras[0]!.id, extras[1]!.id, extras[2]!.id].map(
          (userId) => ({
            gameId: spectator.id,
            userId,
          }),
        ),
      );

      const tournament = await insertFinishedGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        format: GameFormatEnum.FRIENDLY_TOURNAMENT,
      });
      await db.insert(gamePlayers).values(
        [viewer.id, other.id, extras[0]!.id, extras[1]!.id].map((userId) => ({
          gameId: tournament.id,
          userId,
        })),
      );
      await db.insert(matches).values({
        gameId: tournament.id,
        startTime: new Date("2026-08-01T19:00:00.000Z"),
        status: MatchStatusEnum.PENDING,
      });
      await completeInsertedMatch(db, tournament.id);
      await db
        .update(matches)
        .set({
          status: MatchStatusEnum.PENDING,
          startTime: new Date("2026-08-01T19:00:00.000Z"),
        })
        .where(eq(matches.gameId, tournament.id));

      const rows = await listHomeCarouselGames(db, viewer.id, NOW);
      const ids = rows.map((row) => row.id);
      expect(ids).toContain(atCap.id);
      expect(ids).toContain(tournament.id);
      expect(ids).not.toContain(completed.id);
      expect(ids).not.toContain(underCap.id);
      expect(ids).not.toContain(americano.id);
      expect(ids).not.toContain(waitlisted.id);
      expect(ids).not.toContain(spectator.id);
      expect(rows.find((row) => row.id === atCap.id)?.phase).toBe(
        "needs_results",
      );
      expect(rows.find((row) => row.id === atCap.id)?.canAddResults).toBe(
        false,
      );

      const hubIds = (await listMyGamesHubRows(db, viewer.id, NOW)).map(
        (row) => row.id,
      );
      expect(hubIds).not.toContain(atCap.id);
    } finally {
      await close();
    }
  });

  it("sets canAddResults when the viewer could score Sets today", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizer = await insertUser(db, "score-org@example.com");
      const seated = await Promise.all([
        insertUser(db, "score-a@example.com"),
        insertUser(db, "score-b@example.com"),
        insertUser(db, "score-c@example.com"),
        insertUser(db, "score-d@example.com"),
      ]);
      const venue = await insertVenue(db);
      const liveWindow = {
        windowStart: new Date(Date.now() - 60 * 60 * 1000),
        windowEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
      const game = await insertGame(db, {
        createdBy: organizer.id,
        venueId: venue.id,
        ...liveWindow,
      });
      const seats = [
        { sideIndex: 1, position: "left" as const },
        { sideIndex: 1, position: "right" as const },
        { sideIndex: 2, position: "left" as const },
        { sideIndex: 2, position: "right" as const },
      ];
      for (const [index, player] of seated.entries()) {
        const result = await admit(db, {
          game,
          door: "register",
          party: {
            kind: "user",
            userId: player.id,
            seat: seats[index],
          },
        });
        expect(result).toMatchObject({ ok: true });
      }
      await db.update(games).set(PAST_WINDOW).where(eq(games.id, game.id));
      await expireInsertedMatch(db, game.id);

      const organizerRows = await listHomeCarouselGames(db, organizer.id, NOW);
      expect(organizerRows).toEqual([
        expect.objectContaining({
          id: game.id,
          phase: "needs_results",
          canAddResults: true,
        }),
      ]);

      const seatedRows = await listHomeCarouselGames(db, seated[0]!.id, NOW);
      expect(seatedRows).toEqual([
        expect.objectContaining({
          id: game.id,
          phase: "needs_results",
          canAddResults: true,
        }),
      ]);
    } finally {
      await close();
    }
  });
});
