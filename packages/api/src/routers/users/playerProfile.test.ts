import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  GroupSportEnum,
  MatchStatusEnum,
  communities,
  communityMembers,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  gameWaitlist,
  games,
  groupMembers,
  groups,
  matchSets,
  matches,
  ratingEvents,
  ratings,
  teamMembers,
  teams,
  user,
  venues,
} from "@repo/db/schema";

import {
  loadPlayerProfile,
  mayViewPlayer,
} from "#src/routers/users/playerProfile";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { muFromLevel } from "@repo/domain/level";

const T1 = new Date("2026-01-10T12:00:00.000Z");
const NOW = new Date("2026-03-01T12:00:00.000Z");

const WIN = [{ slot1GamesWon: 6, slot2GamesWon: 4 }];
const LOSS = [{ slot1GamesWon: 4, slot2GamesWon: 6 }];
const DRAW = [
  { slot1GamesWon: 6, slot2GamesWon: 4 },
  { slot1GamesWon: 4, slot2GamesWon: 6 },
];

type Sets = { slot1GamesWon: number | null; slot2GamesWon: number | null }[];

function at(day: number) {
  return new Date(Date.UTC(2026, 0, day, 18));
}

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${crypto.randomUUID()}@example.com` })
    .returning();
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(venues)
    .values({ name, city: "Manama", country: "BH" })
    .returning();
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertGroup(
  database: TestDatabase,
  args: { createdBy: string; communityId?: string },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: "Tuesday Crew",
      createdBy: args.createdBy,
      communityId: args.communityId ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function joinGroup(
  database: TestDatabase,
  groupId: string,
  userIds: string[],
) {
  for (const userId of userIds) {
    await database.insert(groupMembers).values({ groupId, userId });
  }
}

async function insertGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    format?: GameFormatEnum;
    sport?: GameSportEnum;
    isPublic?: boolean;
    cancelledAt?: Date | null;
  },
) {
  const [row] = await database
    .insert(games)
    .values({
      name: "Evening padel",
      format: args.format ?? GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      createdBy: args.createdBy,
      isPublic: args.isPublic ?? false,
      sport: args.sport ?? GameSportEnum.PADEL,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart: T1,
      windowEnd: T1,
      cancelledAt: args.cancelledAt ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert game");
  }
  return row;
}

async function seat(database: TestDatabase, gameId: string, userId: string) {
  const [row] = await database
    .insert(gamePlayers)
    .values({ gameId, userId })
    .returning({ id: gamePlayers.id });
  if (!row) {
    throw new Error("Failed to insert game player");
  }
  return row;
}

async function gameTeam(
  database: TestDatabase,
  gameId: string,
  sideIndex: number,
  userIds: string[],
) {
  const [team] = await database
    .insert(gameTeams)
    .values({ gameId, sideIndex })
    .returning({ id: gameTeams.id });
  if (!team) {
    throw new Error("Failed to insert game team");
  }
  for (const userId of userIds) {
    const existing = await database.query.gamePlayers.findFirst({
      where: and(
        eq(gamePlayers.gameId, gameId),
        eq(gamePlayers.userId, userId),
      ),
    });
    const player = existing ?? (await seat(database, gameId, userId));
    await database
      .insert(gameTeamPlayers)
      .values({ gameTeamId: team.id, gamePlayerId: player.id });
  }
  return team;
}

async function playMatch(
  database: TestDatabase,
  args: {
    gameId: string;
    slot1: string[];
    slot2: string[];
    sets: Sets;
    startTime: Date;
    status?: MatchStatusEnum;
  },
) {
  const slot1 = await gameTeam(database, args.gameId, 1, args.slot1);
  const slot2 = await gameTeam(database, args.gameId, 2, args.slot2);
  const [match] = await database
    .insert(matches)
    .values({
      gameId: args.gameId,
      startTime: args.startTime,
      slot1GameTeamId: slot1.id,
      slot2GameTeamId: slot2.id,
      status: args.status ?? MatchStatusEnum.COMPLETED,
    })
    .returning();
  if (!match) {
    throw new Error("Failed to insert match");
  }
  let setNumber = 1;
  for (const set of args.sets) {
    await database
      .insert(matchSets)
      .values({ matchId: match.id, setNumber, ...set });
    setNumber += 1;
  }
  return match;
}

async function seedFour(database: TestDatabase) {
  const player = await insertUser(database, "Elin Nilsson");
  const partner = await insertUser(database, "Jonas Berg");
  const left = await insertUser(database, "Sofia Lind");
  const right = await insertUser(database, "Adam Ross");
  const venue = await insertVenue(database, "Padelhuset");
  return { player, partner, left, right, venue };
}

async function friendlyMatch(
  database: TestDatabase,
  people: Awaited<ReturnType<typeof seedFour>>,
  args: {
    sets: Sets;
    startTime: Date;
    venueId?: string;
    format?: GameFormatEnum;
    sport?: GameSportEnum;
    cancelledAt?: Date | null;
    status?: MatchStatusEnum;
  },
) {
  const game = await insertGame(database, {
    createdBy: people.player.id,
    venueId: args.venueId ?? people.venue.id,
    format: args.format,
    sport: args.sport,
    cancelledAt: args.cancelledAt,
  });
  await playMatch(database, {
    gameId: game.id,
    slot1: [people.player.id, people.partner.id],
    slot2: [people.left.id, people.right.id],
    sets: args.sets,
    startTime: args.startTime,
    status: args.status,
  });
  return game;
}

async function recordPosition(
  database: TestDatabase,
  gameId: string,
  userId: string,
  position: "left" | "right" | null,
) {
  const seated = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)),
  });
  if (!seated) {
    throw new Error("Player is not seated");
  }
  await database
    .update(gameTeamPlayers)
    .set({ position })
    .where(eq(gameTeamPlayers.gamePlayerId, seated.id));
}

describe("mayViewPlayer", () => {
  it("lets a User see their own profile", async () => {
    await withDb(async (db) => {
      const me = await insertUser(db, "Solo Player");
      expect(
        await mayViewPlayer(db, { viewerId: me.id, playerId: me.id }),
      ).toBe(true);
    });
  });

  it("allows a viewer who shares a Group", async () => {
    await withDb(async (db) => {
      const viewer = await insertUser(db, "Viewer");
      const player = await insertUser(db, "Player");
      const group = await insertGroup(db, { createdBy: viewer.id });
      await joinGroup(db, group.id, [viewer.id, player.id]);
      expect(
        await mayViewPlayer(db, { viewerId: viewer.id, playerId: player.id }),
      ).toBe(true);
    });
  });

  it("allows a shared Club Group in a Soft-archived Community", async () => {
    await withDb(async (db) => {
      const viewer = await insertUser(db, "Viewer");
      const player = await insertUser(db, "Player");
      const [community] = await db
        .insert(communities)
        .values({ name: "Club", createdBy: viewer.id, archivedAt: T1 })
        .returning();
      const group = await insertGroup(db, {
        createdBy: viewer.id,
        communityId: community!.id,
      });
      await joinGroup(db, group.id, [viewer.id, player.id]);
      expect(
        await mayViewPlayer(db, { viewerId: viewer.id, playerId: player.id }),
      ).toBe(true);
    });
  });

  it("allows a viewer who shares a Game, including a cancelled one", async () => {
    await withDb(async (db) => {
      const viewer = await insertUser(db, "Viewer");
      const current = await insertUser(db, "Current");
      const cancelled = await insertUser(db, "Cancelled");
      const venue = await insertVenue(db, "Court One");
      const live = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
      });
      const dead = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        cancelledAt: T1,
      });
      await seat(db, live.id, viewer.id);
      await seat(db, live.id, current.id);
      await seat(db, dead.id, viewer.id);
      await seat(db, dead.id, cancelled.id);
      expect(
        await mayViewPlayer(db, { viewerId: viewer.id, playerId: current.id }),
      ).toBe(true);
      expect(
        await mayViewPlayer(db, {
          viewerId: viewer.id,
          playerId: cancelled.id,
        }),
      ).toBe(true);
    });
  });

  it("refuses a viewer who shares only a Community", async () => {
    await withDb(async (db) => {
      const viewer = await insertUser(db, "Viewer");
      const player = await insertUser(db, "Player");
      const [community] = await db
        .insert(communities)
        .values({ name: "Club", createdBy: viewer.id })
        .returning();
      await db.insert(communityMembers).values([
        { communityId: community!.id, userId: viewer.id },
        { communityId: community!.id, userId: player.id },
      ]);
      expect(
        await mayViewPlayer(db, { viewerId: viewer.id, playerId: player.id }),
      ).toBe(false);
    });
  });

  it("refuses a viewer who shares only a Team", async () => {
    await withDb(async (db) => {
      const viewer = await insertUser(db, "Viewer");
      const player = await insertUser(db, "Player");
      const [team] = await db
        .insert(teams)
        .values({ name: "Pair", createdBy: viewer.id })
        .returning();
      await db.insert(teamMembers).values([
        { teamId: team!.id, userId: viewer.id },
        { teamId: team!.id, userId: player.id },
      ]);
      expect(
        await mayViewPlayer(db, { viewerId: viewer.id, playerId: player.id }),
      ).toBe(false);
    });
  });

  it("refuses a viewer who is only waitlisted on the Player's Game", async () => {
    await withDb(async (db) => {
      const viewer = await insertUser(db, "Viewer");
      const player = await insertUser(db, "Player");
      const venue = await insertVenue(db, "Court One");
      const game = await insertGame(db, {
        createdBy: player.id,
        venueId: venue.id,
      });
      await seat(db, game.id, player.id);
      await db
        .insert(gameWaitlist)
        .values({ gameId: game.id, userId: viewer.id });
      expect(
        await mayViewPlayer(db, { viewerId: viewer.id, playerId: player.id }),
      ).toBe(false);
    });
  });

  it("refuses once the Player left the only shared Group", async () => {
    await withDb(async (db) => {
      const viewer = await insertUser(db, "Viewer");
      const player = await insertUser(db, "Player");
      const group = await insertGroup(db, { createdBy: viewer.id });
      await joinGroup(db, group.id, [viewer.id, player.id]);
      await db
        .delete(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, player.id),
          ),
        );
      expect(
        await mayViewPlayer(db, { viewerId: viewer.id, playerId: player.id }),
      ).toBe(false);
    });
  });

  it("refuses once the Player was kicked from the only shared Game", async () => {
    await withDb(async (db) => {
      const viewer = await insertUser(db, "Viewer");
      const player = await insertUser(db, "Player");
      const venue = await insertVenue(db, "Court One");
      const game = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
      });
      await seat(db, game.id, viewer.id);
      const kicked = await seat(db, game.id, player.id);
      await db.delete(gamePlayers).where(eq(gamePlayers.id, kicked.id));
      expect(
        await mayViewPlayer(db, { viewerId: viewer.id, playerId: player.id }),
      ).toBe(false);
    });
  });

  it("refuses an unknown User", async () => {
    await withDb(async (db) => {
      const viewer = await insertUser(db, "Viewer");
      expect(
        await mayViewPlayer(db, {
          viewerId: viewer.id,
          playerId: crypto.randomUUID(),
        }),
      ).toBe(false);
    });
  });

  it("refuses a non-member viewing a public Game they have not joined", async () => {
    await withDb(async (db) => {
      const viewer = await insertUser(db, "Viewer");
      const player = await insertUser(db, "Player");
      const venue = await insertVenue(db, "Court One");
      const game = await insertGame(db, {
        createdBy: player.id,
        venueId: venue.id,
        isPublic: true,
      });
      await seat(db, game.id, player.id);
      expect(
        await mayViewPlayer(db, { viewerId: viewer.id, playerId: player.id }),
      ).toBe(false);
    });
  });
});

describe("loadPlayerProfile", () => {
  it("throws NOT_FOUND for an unknown and for an unshared User alike", async () => {
    await withDb(async (db) => {
      const viewer = await insertUser(db, "Viewer");
      const stranger = await insertUser(db, "Stranger");
      for (const playerId of [stranger.id, crypto.randomUUID()]) {
        await expect(
          loadPlayerProfile(db, { viewerId: viewer.id, playerId }),
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
      }
    });
  });

  it("returns the header, no Rating and zero Overall for a new User", async () => {
    await withDb(async (db) => {
      const viewer = await insertUser(db, "Elin Nilsson");
      const result = await loadPlayerProfile(db, {
        viewerId: viewer.id,
        playerId: viewer.id,
        now: NOW,
      });
      expect(result).toEqual({
        player: {
          id: viewer.id,
          name: "Elin Nilsson",
          image: null,
          isViewer: true,
        },
        venue: null,
        rating: null,
        overall: {
          played: 0,
          won: 0,
          lost: 0,
          drawn: 0,
          setsWon: 0,
          setsPlayed: 0,
        },
        streaks: { current: 0, best: 0, bestReachedAt: null },
        position: {
          declared: null,
          recordedCount: 0,
          leftCount: 0,
          rightCount: 0,
        },
      });
    });
  });

  it("reads the current and best Win streak, giving a tie to the more recent one", async () => {
    await withDb(async (db) => {
      const people = await seedFour(db);
      const oldestFirst = [WIN, WIN, LOSS, WIN, WIN, DRAW, WIN];
      for (const [index, sets] of oldestFirst.entries()) {
        await friendlyMatch(db, people, { sets, startTime: at(index + 1) });
      }
      const result = await loadPlayerProfile(db, {
        viewerId: people.left.id,
        playerId: people.player.id,
      });
      expect(result.streaks).toEqual({
        current: 1,
        best: 2,
        bestReachedAt: at(5),
      });
    });
  });

  it("has no current streak when the newest Match is lost", async () => {
    await withDb(async (db) => {
      const people = await seedFour(db);
      for (const [index, sets] of [WIN, WIN, WIN, LOSS].entries()) {
        await friendlyMatch(db, people, { sets, startTime: at(index + 1) });
      }
      const result = await loadPlayerProfile(db, {
        viewerId: people.left.id,
        playerId: people.player.id,
      });
      expect(result.streaks).toEqual({
        current: 0,
        best: 3,
        bestReachedAt: at(3),
      });
    });
  });

  it("counts the played side over Matches with a recorded Position only", async () => {
    await withDb(async (db) => {
      const people = await seedFour(db);
      await db
        .update(user)
        .set({ preferredPosition: "left" })
        .where(eq(user.id, people.player.id));
      const positions = ["left", "left", "right", null] as const;
      for (const [index, position] of positions.entries()) {
        const game = await friendlyMatch(db, people, {
          sets: WIN,
          startTime: at(index + 1),
        });
        await recordPosition(db, game.id, people.player.id, position);
      }
      await friendlyMatch(db, people, {
        sets: WIN,
        startTime: at(9),
        sport: GameSportEnum.Football,
      });
      const result = await loadPlayerProfile(db, {
        viewerId: people.left.id,
        playerId: people.player.id,
      });
      expect(result.position).toEqual({
        declared: "left",
        recordedCount: 3,
        leftCount: 2,
        rightCount: 1,
      });
    });
  });

  it("counts every padel format and leaves out cancelled Games, Walkovers and football", async () => {
    await withDb(async (db) => {
      const people = await seedFour(db);
      await friendlyMatch(db, people, { sets: WIN, startTime: at(1) });
      await friendlyMatch(db, people, {
        sets: WIN,
        startTime: at(2),
        format: GameFormatEnum.AMERICANO,
      });
      await friendlyMatch(db, people, {
        sets: LOSS,
        startTime: at(3),
        format: GameFormatEnum.FRIENDLY_TOURNAMENT,
      });
      await friendlyMatch(db, people, { sets: DRAW, startTime: at(4) });
      await friendlyMatch(db, people, {
        sets: WIN,
        startTime: at(5),
        cancelledAt: T1,
      });
      await friendlyMatch(db, people, {
        sets: [],
        startTime: at(6),
        status: MatchStatusEnum.CANCELLED,
      });
      await friendlyMatch(db, people, {
        sets: WIN,
        startTime: at(7),
        sport: GameSportEnum.Football,
      });

      const result = await loadPlayerProfile(db, {
        viewerId: people.left.id,
        playerId: people.player.id,
      });
      expect(result.player.isViewer).toBe(false);
      expect(result.overall).toEqual({
        played: 4,
        won: 2,
        lost: 1,
        drawn: 1,
        setsWon: 3,
        setsPlayed: 5,
      });
    });
  });

  it("counts Sets from the Player's side and a drawn Set as played", async () => {
    await withDb(async (db) => {
      const people = await seedFour(db);
      await friendlyMatch(db, people, {
        startTime: at(1),
        sets: [
          { slot1GamesWon: 6, slot2GamesWon: 6 },
          { slot1GamesWon: 3, slot2GamesWon: 6 },
          { slot1GamesWon: null, slot2GamesWon: null },
        ],
      });
      const result = await loadPlayerProfile(db, {
        viewerId: people.left.id,
        playerId: people.left.id,
      });
      expect(result.overall).toEqual({
        played: 1,
        won: 1,
        lost: 0,
        drawn: 0,
        setsWon: 1,
        setsPlayed: 2,
      });
    });
  });

  it("names the most-played Venue of the ten newest Matches", async () => {
    await withDb(async (db) => {
      const people = await seedFour(db);
      const other = await insertVenue(db, "Rafa Club");
      for (const day of [1, 2, 3]) {
        await friendlyMatch(db, people, {
          sets: WIN,
          startTime: at(day),
          venueId: other.id,
        });
      }
      for (const day of [4, 5]) {
        await friendlyMatch(db, people, { sets: WIN, startTime: at(day) });
      }
      const result = await loadPlayerProfile(db, {
        viewerId: people.player.id,
        playerId: people.player.id,
      });
      expect(result.venue).toEqual({ name: "Rafa Club" });
    });
  });

  it("breaks a Venue tie toward the more recent Match and ignores older Matches", async () => {
    await withDb(async (db) => {
      const people = await seedFour(db);
      const old = await insertVenue(db, "Old Club");
      const recent = await insertVenue(db, "New Club");
      for (const day of [1, 2, 3]) {
        await friendlyMatch(db, people, {
          sets: WIN,
          startTime: at(day),
          venueId: old.id,
        });
      }
      for (const day of [10, 12, 14, 16, 18]) {
        await friendlyMatch(db, people, {
          sets: WIN,
          startTime: at(day),
          venueId: people.venue.id,
        });
      }
      for (const day of [11, 13, 15, 17, 19]) {
        await friendlyMatch(db, people, {
          sets: WIN,
          startTime: at(day),
          venueId: recent.id,
        });
      }
      const result = await loadPlayerProfile(db, {
        viewerId: people.player.id,
        playerId: people.player.id,
      });
      expect(result.venue).toEqual({ name: "New Club" });
    });
  });

  it("hides the Venue below two Matches there", async () => {
    await withDb(async (db) => {
      const people = await seedFour(db);
      const other = await insertVenue(db, "Rafa Club");
      await friendlyMatch(db, people, { sets: WIN, startTime: at(1) });
      await friendlyMatch(db, people, {
        sets: WIN,
        startTime: at(2),
        venueId: other.id,
      });
      const result = await loadPlayerProfile(db, {
        viewerId: people.player.id,
        playerId: people.player.id,
      });
      expect(result.venue).toBeNull();
    });
  });

  it("reads the padel Rating the way ratings.me does, with idle inflation", async () => {
    await withDb(async (db) => {
      const people = await seedFour(db);
      const match = await friendlyMatch(db, people, {
        sets: WIN,
        startTime: at(1),
      });
      const [row] = await db
        .select({ id: matches.id })
        .from(matches)
        .where(eq(matches.gameId, match.id));
      await db.insert(ratings).values({
        userId: people.player.id,
        sport: GroupSportEnum.PADEL,
        mu: muFromLevel(4.55),
        phi: 190,
        sigma: 0.06,
        levelBand: "B3",
        lastRatedAt: new Date("2020-01-01T00:00:00.000Z"),
      });
      await db.insert(ratingEvents).values({
        userId: people.player.id,
        sport: GroupSportEnum.PADEL,
        matchId: row!.id,
        outcomeScore: 1,
        weight: 1,
        muBefore: muFromLevel(4.4),
        phiBefore: 200,
        sigmaBefore: 0.06,
        muAfter: muFromLevel(4.55),
        phiAfter: 190,
        sigmaAfter: 0.06,
      });

      const fresh = await loadPlayerProfile(db, {
        viewerId: people.left.id,
        playerId: people.player.id,
        now: new Date("2020-01-02T00:00:00.000Z"),
      });
      expect(fresh.rating).toEqual({
        level: "4.6",
        levelBand: "B3",
        provisional: false,
        ratedMatchCount: 1,
        ratedMatchesRemaining: 0,
        levelValue: expect.closeTo(4.55, 6),
      });

      const idle = await loadPlayerProfile(db, {
        viewerId: people.left.id,
        playerId: people.player.id,
        now: NOW,
      });
      expect(idle.rating?.provisional).toBe(true);
      expect(idle.rating?.ratedMatchesRemaining).toBeGreaterThan(0);
    });
  });
});
