import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GamePositionEnum,
  GameRegistrationModeEnum,
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  matchSets,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { loadHome } from "~/server/api/routers/users/home";
import { loadProfileStats } from "~/server/api/routers/users/profileStats";
import { nextMatchSetNumber } from "~/server/games/next-match-set-number";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

const T0 = new Date("2023-03-15T12:00:00.000Z");
const T1 = new Date("2024-01-10T12:00:00.000Z");
const T2 = new Date("2024-02-10T12:00:00.000Z");
const T3 = new Date("2024-03-10T12:00:00.000Z");
const T4 = new Date("2024-04-10T12:00:00.000Z");

async function insertUser(
  database: TestDatabase,
  email: string,
  name?: string,
) {
  const [row] = await database
    .insert(user)
    .values({ name: name ?? email.split("@")[0] ?? "User", email })
    .returning();
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

async function insertGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    cancelledAt?: Date | null;
  },
) {
  const [row] = await database
    .insert(games)
    .values({
      name: "Friendly night",
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      createdBy: args.createdBy,
      isPublic: false,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart: T1,
      windowEnd: T4,
      cancelledAt: args.cancelledAt ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert game");
  }
  const [match] = await database
    .insert(matches)
    .values({
      gameId: row.id,
      startTime: T1,
    })
    .returning();
  if (!match) {
    throw new Error("Failed to insert match");
  }
  return { game: row, match };
}

async function occupySeat(
  database: TestDatabase,
  args: {
    gameId: string;
    gameTeamId: string;
    occupant: { id: string };
    position: (typeof GamePositionEnum)[keyof typeof GamePositionEnum];
  },
) {
  const [player] = await database
    .insert(gamePlayers)
    .values({ gameId: args.gameId, userId: args.occupant.id })
    .returning({ id: gamePlayers.id });
  if (!player) {
    throw new Error("Failed to insert game player");
  }
  await database.insert(gameTeamPlayers).values({
    gameTeamId: args.gameTeamId,
    gamePlayerId: player.id,
    position: args.position,
  });
}

async function seatCompletedMatch(
  database: TestDatabase,
  args: {
    gameId: string;
    matchId: string;
    slot1: { left: { id: string }; right?: { id: string } };
    slot2: { left: { id: string }; right?: { id: string } };
    sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
    status?: (typeof MatchStatusEnum)[keyof typeof MatchStatusEnum];
    startTime?: Date | null;
  },
) {
  const [slot1Team] = await database
    .insert(gameTeams)
    .values({ gameId: args.gameId, sideIndex: 1 })
    .returning({ id: gameTeams.id });
  const [slot2Team] = await database
    .insert(gameTeams)
    .values({ gameId: args.gameId, sideIndex: 2 })
    .returning({ id: gameTeams.id });
  if (!slot1Team || !slot2Team) {
    throw new Error("Failed to insert game teams");
  }

  await occupySeat(database, {
    gameId: args.gameId,
    gameTeamId: slot1Team.id,
    occupant: args.slot1.left,
    position: GamePositionEnum.LEFT,
  });
  if (args.slot1.right) {
    await occupySeat(database, {
      gameId: args.gameId,
      gameTeamId: slot1Team.id,
      occupant: args.slot1.right,
      position: GamePositionEnum.RIGHT,
    });
  }
  await occupySeat(database, {
    gameId: args.gameId,
    gameTeamId: slot2Team.id,
    occupant: args.slot2.left,
    position: GamePositionEnum.LEFT,
  });
  if (args.slot2.right) {
    await occupySeat(database, {
      gameId: args.gameId,
      gameTeamId: slot2Team.id,
      occupant: args.slot2.right,
      position: GamePositionEnum.RIGHT,
    });
  }

  await database
    .update(matches)
    .set({
      slot1GameTeamId: slot1Team.id,
      slot2GameTeamId: slot2Team.id,
      status: args.status ?? MatchStatusEnum.COMPLETED,
      startTime: args.startTime === undefined ? T1 : args.startTime,
    })
    .where(eq(matches.id, args.matchId));

  for (const set of args.sets) {
    await database.insert(matchSets).values({
      matchId: args.matchId,
      setNumber: await nextMatchSetNumber(database, args.matchId),
      slot1GamesWon: set.slot1GamesWon,
      slot2GamesWon: set.slot2GamesWon,
    });
  }
}

async function playMatch(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    slot1: { left: { id: string }; right?: { id: string } };
    slot2: { left: { id: string }; right?: { id: string } };
    sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
    startTime: Date;
    cancelledAt?: Date | null;
    status?: (typeof MatchStatusEnum)[keyof typeof MatchStatusEnum];
  },
) {
  const seeded = await insertGame(database, {
    createdBy: args.createdBy,
    venueId: args.venueId,
    cancelledAt: args.cancelledAt,
  });
  await seatCompletedMatch(database, {
    gameId: seeded.game.id,
    matchId: seeded.match.id,
    slot1: args.slot1,
    slot2: args.slot2,
    sets: args.sets,
    startTime: args.startTime,
    status: args.status,
  });
  return seeded;
}

const WIN = [{ slot1GamesWon: 6, slot2GamesWon: 4 }];
const LOSS = [{ slot1GamesWon: 4, slot2GamesWon: 6 }];
const DRAW = [
  { slot1GamesWon: 6, slot2GamesWon: 4 },
  { slot1GamesWon: 4, slot2GamesWon: 6 },
];

describe("loadProfileStats", () => {
  it("returns zeros and nulls when the User has no completed Matches", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "profile-stats-none@example.com");
      const result = await loadProfileStats(db, { userId: viewer.id });
      expect(result).toEqual({
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        setsWon: 0,
        setsLost: 0,
        longestWinStreak: 0,
        mostPlayedPartner: null,
        firstMatchAt: null,
      });
    } finally {
      await close();
    }
  });

  it("counts a draw as played, not won or lost", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "profile-stats-draw-v@example.com");
      const partner = await insertUser(db, "profile-stats-draw-p@example.com");
      const oppLeft = await insertUser(db, "profile-stats-draw-ol@example.com");
      const oppRight = await insertUser(
        db,
        "profile-stats-draw-or@example.com",
      );
      const venue = await insertVenue(db);

      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: DRAW,
        startTime: T1,
      });

      const result = await loadProfileStats(db, { userId: viewer.id });
      expect(result.matchesPlayed).toBe(1);
      expect(result.matchesWon).toBe(0);
      expect(result.matchesLost).toBe(0);
    } finally {
      await close();
    }
  });

  it("adds set wins and losses across completed Matches", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "profile-stats-sets-v@example.com");
      const partner = await insertUser(db, "profile-stats-sets-p@example.com");
      const oppLeft = await insertUser(db, "profile-stats-sets-ol@example.com");
      const oppRight = await insertUser(
        db,
        "profile-stats-sets-or@example.com",
      );
      const venue = await insertVenue(db);

      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: [
          { slot1GamesWon: 6, slot2GamesWon: 3 },
          { slot1GamesWon: 6, slot2GamesWon: 4 },
        ],
        startTime: T1,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: [
          { slot1GamesWon: 6, slot2GamesWon: 4 },
          { slot1GamesWon: 3, slot2GamesWon: 6 },
          { slot1GamesWon: 6, slot2GamesWon: 2 },
        ],
        startTime: T2,
      });

      const result = await loadProfileStats(db, { userId: viewer.id });
      expect(result.setsWon).toBe(4);
      expect(result.setsLost).toBe(1);
    } finally {
      await close();
    }
  });

  it("breaks a win streak on a draw", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "profile-stats-streak-v@example.com");
      const partner = await insertUser(
        db,
        "profile-stats-streak-p@example.com",
      );
      const oppLeft = await insertUser(
        db,
        "profile-stats-streak-ol@example.com",
      );
      const oppRight = await insertUser(
        db,
        "profile-stats-streak-or@example.com",
      );
      const venue = await insertVenue(db);

      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: WIN,
        startTime: T1,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: WIN,
        startTime: T2,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: DRAW,
        startTime: T3,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: WIN,
        startTime: T4,
      });

      const result = await loadProfileStats(db, { userId: viewer.id });
      expect(result.longestWinStreak).toBe(2);
    } finally {
      await close();
    }
  });

  it("breaks a partner-count tie with the most recent shared Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(
        db,
        "profile-stats-partner-v@example.com",
        "Mikael Karlsson",
      );
      const sofia = await insertUser(
        db,
        "profile-stats-partner-sofia@example.com",
        "Sofia Lindqvist",
      );
      const ana = await insertUser(
        db,
        "profile-stats-partner-ana@example.com",
        "Ana Maria Santos",
      );
      const oppLeft = await insertUser(
        db,
        "profile-stats-partner-ol@example.com",
      );
      const oppRight = await insertUser(
        db,
        "profile-stats-partner-or@example.com",
      );
      const venue = await insertVenue(db);

      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: sofia },
        slot2: { left: oppLeft, right: oppRight },
        sets: WIN,
        startTime: T1,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: ana },
        slot2: { left: oppLeft, right: oppRight },
        sets: WIN,
        startTime: T2,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: sofia },
        slot2: { left: oppLeft, right: oppRight },
        sets: LOSS,
        startTime: T3,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: ana },
        slot2: { left: oppLeft, right: oppRight },
        sets: WIN,
        startTime: T4,
      });

      const result = await loadProfileStats(db, { userId: viewer.id });
      expect(result.mostPlayedPartner).toEqual({
        userId: ana.id,
        name: "Ana Maria Santos",
      });
    } finally {
      await close();
    }
  });

  it("breaks an equal partner count and recency on userId ascending", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "profile-stats-id-v@example.com");
      const sofia = await insertUser(
        db,
        "profile-stats-id-sofia@example.com",
        "Sofia Lindqvist",
      );
      const ana = await insertUser(
        db,
        "profile-stats-id-ana@example.com",
        "Ana Maria Santos",
      );
      const oppLeft = await insertUser(db, "profile-stats-id-ol@example.com");
      const oppRight = await insertUser(db, "profile-stats-id-or@example.com");
      const venue = await insertVenue(db);
      const earlier = sofia.id < ana.id ? sofia : ana;

      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: sofia },
        slot2: { left: oppLeft, right: oppRight },
        sets: WIN,
        startTime: T1,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: ana },
        slot2: { left: oppLeft, right: oppRight },
        sets: WIN,
        startTime: T1,
      });

      const result = await loadProfileStats(db, { userId: viewer.id });
      expect(result.mostPlayedPartner).toEqual({
        userId: earlier.id,
        name: earlier.name,
      });
    } finally {
      await close();
    }
  });

  it("returns firstMatchAt as the earliest in-scope Match time", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "profile-stats-first-v@example.com");
      const partner = await insertUser(db, "profile-stats-first-p@example.com");
      const oppLeft = await insertUser(
        db,
        "profile-stats-first-ol@example.com",
      );
      const oppRight = await insertUser(
        db,
        "profile-stats-first-or@example.com",
      );
      const venue = await insertVenue(db);

      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: WIN,
        startTime: T0,
        cancelledAt: T0,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: WIN,
        startTime: T2,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: LOSS,
        startTime: T1,
      });

      const result = await loadProfileStats(db, { userId: viewer.id });
      expect(result.firstMatchAt).toEqual(T1);
    } finally {
      await close();
    }
  });

  it("matches users.home played / won / lost for the same fixture", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "profile-stats-home-v@example.com");
      const partner = await insertUser(db, "profile-stats-home-p@example.com");
      const oppLeft = await insertUser(db, "profile-stats-home-ol@example.com");
      const oppRight = await insertUser(
        db,
        "profile-stats-home-or@example.com",
      );
      const venue = await insertVenue(db);

      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: WIN,
        startTime: T1,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: oppLeft, right: oppRight },
        slot2: { left: viewer, right: partner },
        sets: WIN,
        startTime: T2,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: DRAW,
        startTime: T3,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: LOSS,
        startTime: T0,
        cancelledAt: T0,
      });
      await playMatch(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: WIN,
        startTime: T4,
        status: MatchStatusEnum.PENDING,
      });

      const [home, stats] = await Promise.all([
        loadHome(db, { userId: viewer.id }),
        loadProfileStats(db, { userId: viewer.id }),
      ]);

      expect(stats.matchesPlayed).toBe(home.gamesPlayed);
      expect(stats.matchesWon).toBe(home.gamesWon);
      expect(stats.matchesLost).toBe(home.gamesLost);
      expect(stats.matchesPlayed).toBe(3);
      expect(stats.matchesWon).toBe(1);
      expect(stats.matchesLost).toBe(1);
    } finally {
      await close();
    }
  });
});
