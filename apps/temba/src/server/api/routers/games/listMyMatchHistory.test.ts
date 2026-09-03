import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GamePositionEnum,
  GameRegistrationModeEnum,
  MatchStatusEnum,
  communities,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  gameWaitlist,
  games,
  groups,
  matchSets,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { listMyMatchHistoryRows } from "~/server/api/routers/games/listMyMatchHistory";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

const NOW = new Date("2026-08-31T16:00:00.000Z");
const PAST_START = new Date("2026-08-01T18:00:00.000Z");
const PAST_END = new Date("2026-08-01T20:00:00.000Z");
const LIVE_END = new Date("2026-09-01T20:00:00.000Z");

async function insertUser(
  database: TestDatabase,
  email: string,
  image: string | null = null,
) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "Test User", email, image })
    .returning();
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase, name?: string) {
  const [row] = await database
    .insert(venues)
    .values({
      name: name ?? `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning();
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
    name?: string | null;
    format?: (typeof GameFormatEnum)[keyof typeof GameFormatEnum];
    groupId?: string | null;
    windowStart?: Date | null;
    windowEnd?: Date | null;
    cancelledAt?: Date | null;
  },
) {
  const [row] = await database
    .insert(games)
    .values({
      name: args.name ?? "Friendly night",
      format: args.format ?? GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      createdBy: args.createdBy,
      groupId: args.groupId ?? null,
      isPublic: false,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart:
        args.windowStart === undefined ? PAST_START : args.windowStart,
      windowEnd: args.windowEnd === undefined ? PAST_END : args.windowEnd,
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
      startTime: PAST_START,
    })
    .returning();
  if (!match) {
    throw new Error("Failed to insert match");
  }
  return { game: row, match };
}

async function seatCompletedFriendly(
  database: TestDatabase,
  args: {
    gameId: string;
    matchId: string;
    slot1: { left: { id: string }; right: { id: string } };
    slot2: { left: { id: string }; right: { id: string } };
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

  async function occupy(
    gameTeamId: string,
    occupant: { id: string },
    position: (typeof GamePositionEnum)[keyof typeof GamePositionEnum],
  ) {
    const [player] = await database
      .insert(gamePlayers)
      .values({ gameId: args.gameId, userId: occupant.id })
      .returning({ id: gamePlayers.id });
    if (!player) {
      throw new Error("Failed to insert game player");
    }
    await database.insert(gameTeamPlayers).values({
      gameTeamId,
      gamePlayerId: player.id,
      position,
    });
  }

  await occupy(slot1Team.id, args.slot1.left, GamePositionEnum.LEFT);
  await occupy(slot1Team.id, args.slot1.right, GamePositionEnum.RIGHT);
  await occupy(slot2Team.id, args.slot2.left, GamePositionEnum.LEFT);
  await occupy(slot2Team.id, args.slot2.right, GamePositionEnum.RIGHT);

  await database
    .update(matches)
    .set({
      slot1GameTeamId: slot1Team.id,
      slot2GameTeamId: slot2Team.id,
      status: args.status ?? MatchStatusEnum.COMPLETED,
      startTime: args.startTime === undefined ? PAST_START : args.startTime,
    })
    .where(eq(matches.id, args.matchId));

  for (const set of args.sets) {
    await database.insert(matchSets).values({
      matchId: args.matchId,
      slot1GamesWon: set.slot1GamesWon,
      slot2GamesWon: set.slot2GamesWon,
    });
  }

  return { slot1TeamId: slot1Team.id, slot2TeamId: slot2Team.id };
}

describe("listMyMatchHistoryRows", () => {
  it("includes seated completed Friendly games and excludes waitlisted, registered-only, and organizer-only viewers", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(
        db,
        "history-viewer@example.com",
        "https://img.example/v.png",
      );
      const partner = await insertUser(db, "history-partner@example.com");
      const oppLeft = await insertUser(db, "history-opp-left@example.com");
      const oppRight = await insertUser(db, "history-opp-right@example.com");
      const organizer = await insertUser(db, "history-organizer@example.com");
      const venue = await insertVenue(db, "Padel Club");

      const seated = await insertGame(db, {
        createdBy: organizer.id,
        venueId: venue.id,
        name: "Friday Friendly",
      });
      await seatCompletedFriendly(db, {
        gameId: seated.game.id,
        matchId: seated.match.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: [
          { slot1GamesWon: 6, slot2GamesWon: 2 },
          { slot1GamesWon: 6, slot2GamesWon: 3 },
          { slot1GamesWon: null, slot2GamesWon: null },
        ],
      });

      const waitlisted = await insertGame(db, {
        createdBy: organizer.id,
        venueId: venue.id,
        name: "Waitlisted Game",
      });
      await db.insert(gameWaitlist).values({
        gameId: waitlisted.game.id,
        userId: viewer.id,
      });
      await seatCompletedFriendly(db, {
        gameId: waitlisted.game.id,
        matchId: waitlisted.match.id,
        slot1: { left: partner, right: oppLeft },
        slot2: { left: oppRight, right: organizer },
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 1 }],
      });

      const registeredOnly = await insertGame(db, {
        createdBy: organizer.id,
        venueId: venue.id,
        name: "Registered only",
      });
      await db.insert(gamePlayers).values({
        gameId: registeredOnly.game.id,
        userId: viewer.id,
      });
      await seatCompletedFriendly(db, {
        gameId: registeredOnly.game.id,
        matchId: registeredOnly.match.id,
        slot1: { left: partner, right: oppLeft },
        slot2: { left: oppRight, right: organizer },
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 4 }],
      });

      const organized = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        name: "Organized only",
      });
      await seatCompletedFriendly(db, {
        gameId: organized.game.id,
        matchId: organized.match.id,
        slot1: { left: partner, right: oppLeft },
        slot2: { left: oppRight, right: organizer },
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 0 }],
      });

      const rows = await listMyMatchHistoryRows(db, viewer.id, NOW);
      expect(rows.map((row) => row.id)).toEqual([seated.game.id]);
      expect(rows[0]).toMatchObject({
        name: "Friday Friendly",
        format: GameFormatEnum.FRIENDLY_GAME,
        venue: { name: "Padel Club" },
        matchId: seated.match.id,
        outcome: "won",
        scoredSets: [
          { slot1GamesWon: 6, slot2GamesWon: 2 },
          { slot1GamesWon: 6, slot2GamesWon: 3 },
        ],
      });
      expect(rows[0]?.displayTime).toEqual(PAST_START);
      expect(rows[0]?.slot1Members.map((member) => member.id)).toEqual([
        viewer.id,
        partner.id,
      ]);
      expect(rows[0]?.slot1Members[0]).toMatchObject({
        id: viewer.id,
        image: "https://img.example/v.png",
      });
      expect(rows[0]?.slot2Members.map((member) => member.id)).toEqual([
        oppLeft.id,
        oppRight.id,
      ]);
    } finally {
      await close();
    }
  });

  it("excludes live Friendly games and includes them after they are no longer live", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "live-viewer@example.com");
      const partner = await insertUser(db, "live-partner@example.com");
      const oppLeft = await insertUser(db, "live-opp-left@example.com");
      const oppRight = await insertUser(db, "live-opp-right@example.com");
      const venue = await insertVenue(db);

      const { game, match } = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        windowStart: PAST_START,
        windowEnd: LIVE_END,
      });
      await seatCompletedFriendly(db, {
        gameId: game.id,
        matchId: match.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 2 }],
      });

      expect(await listMyMatchHistoryRows(db, viewer.id, NOW)).toEqual([]);

      await db
        .update(games)
        .set({ windowEnd: PAST_END })
        .where(eq(games.id, game.id));

      const rows = await listMyMatchHistoryRows(db, viewer.id, NOW);
      expect(rows.map((row) => row.id)).toEqual([game.id]);
    } finally {
      await close();
    }
  });

  it("excludes cancelled Games and includes Soft-archived Club Group Friendly games", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "archive-viewer@example.com");
      const partner = await insertUser(db, "archive-partner@example.com");
      const oppLeft = await insertUser(db, "archive-opp-left@example.com");
      const oppRight = await insertUser(db, "archive-opp-right@example.com");
      const organizer = await insertUser(db, "archive-organizer@example.com");
      const venue = await insertVenue(db);

      const cancelled = await insertGame(db, {
        createdBy: organizer.id,
        venueId: venue.id,
        cancelledAt: NOW,
      });
      await seatCompletedFriendly(db, {
        gameId: cancelled.game.id,
        matchId: cancelled.match.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 1 }],
      });

      const [community] = await db
        .insert(communities)
        .values({
          name: "Archived Club",
          type: "private",
          createdBy: organizer.id,
          archivedAt: NOW,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      const [group] = await db
        .insert(groups)
        .values({
          name: "Club Group",
          createdBy: organizer.id,
          communityId: community.id,
        })
        .returning({ id: groups.id });
      if (!group) {
        throw new Error("Failed to insert group");
      }

      const archived = await insertGame(db, {
        createdBy: organizer.id,
        venueId: venue.id,
        groupId: group.id,
        name: "Club night",
      });
      await seatCompletedFriendly(db, {
        gameId: archived.game.id,
        matchId: archived.match.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 4 }],
      });

      const rows = await listMyMatchHistoryRows(db, viewer.id, NOW);
      expect(rows.map((row) => row.id)).toEqual([archived.game.id]);
    } finally {
      await close();
    }
  });

  it("excludes Friendly tournament and Americano even with completed Matches", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "format-viewer@example.com");
      const partner = await insertUser(db, "format-partner@example.com");
      const oppLeft = await insertUser(db, "format-opp-left@example.com");
      const oppRight = await insertUser(db, "format-opp-right@example.com");
      const venue = await insertVenue(db);

      const tournament = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        format: GameFormatEnum.FRIENDLY_TOURNAMENT,
      });
      await seatCompletedFriendly(db, {
        gameId: tournament.game.id,
        matchId: tournament.match.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 1 }],
      });

      const americano = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        format: GameFormatEnum.AMERICANO,
      });
      await seatCompletedFriendly(db, {
        gameId: americano.game.id,
        matchId: americano.match.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 2 }],
      });

      expect(await listMyMatchHistoryRows(db, viewer.id, NOW)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("maps won/lost/draw, uses the latest seated completed Match, and sorts newest first", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "outcome-viewer@example.com");
      const partner = await insertUser(db, "outcome-partner@example.com");
      const oppLeft = await insertUser(db, "outcome-opp-left@example.com");
      const oppRight = await insertUser(db, "outcome-opp-right@example.com");
      const venue = await insertVenue(db);

      const olderWin = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        name: "Older win",
      });
      const olderStart = new Date("2026-07-01T18:00:00.000Z");
      await seatCompletedFriendly(db, {
        gameId: olderWin.game.id,
        matchId: olderWin.match.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 2 }],
        startTime: olderStart,
      });

      const loss = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        name: "Loss",
      });
      const lossStart = new Date("2026-07-15T18:00:00.000Z");
      await seatCompletedFriendly(db, {
        gameId: loss.game.id,
        matchId: loss.match.id,
        slot1: { left: oppLeft, right: oppRight },
        slot2: { left: viewer, right: partner },
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 3 }],
        startTime: lossStart,
      });

      const draw = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        name: "Draw",
      });
      const drawStart = new Date("2026-08-10T18:00:00.000Z");
      await seatCompletedFriendly(db, {
        gameId: draw.game.id,
        matchId: draw.match.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: [
          { slot1GamesWon: 6, slot2GamesWon: 4 },
          { slot1GamesWon: 4, slot2GamesWon: 6 },
        ],
        startTime: drawStart,
      });

      const fallbackTime = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        name: "Fallback time",
        windowStart: new Date("2026-08-20T18:00:00.000Z"),
      });
      await seatCompletedFriendly(db, {
        gameId: fallbackTime.game.id,
        matchId: fallbackTime.match.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 1 }],
        startTime: null,
      });

      const multi = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        name: "Two matches",
      });
      await seatCompletedFriendly(db, {
        gameId: multi.game.id,
        matchId: multi.match.id,
        slot1: { left: viewer, right: partner },
        slot2: { left: oppLeft, right: oppRight },
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 0 }],
        startTime: new Date("2026-06-01T18:00:00.000Z"),
      });
      const [laterMatch] = await db
        .insert(matches)
        .values({
          gameId: multi.game.id,
          startTime: new Date("2026-08-25T18:00:00.000Z"),
          status: MatchStatusEnum.COMPLETED,
          slot1GameTeamId: (
            await db.query.matches.findFirst({
              where: eq(matches.id, multi.match.id),
            })
          )?.slot2GameTeamId,
          slot2GameTeamId: (
            await db.query.matches.findFirst({
              where: eq(matches.id, multi.match.id),
            })
          )?.slot1GameTeamId,
        })
        .returning();
      if (!laterMatch) {
        throw new Error("Failed to insert later match");
      }
      await db.insert(matchSets).values({
        matchId: laterMatch.id,
        slot1GamesWon: 6,
        slot2GamesWon: 4,
      });

      const rows = await listMyMatchHistoryRows(db, viewer.id, NOW);
      expect(rows.map((row) => row.name)).toEqual([
        "Two matches",
        "Fallback time",
        "Draw",
        "Loss",
        "Older win",
      ]);
      expect(rows[0]).toMatchObject({
        matchId: laterMatch.id,
        outcome: "lost",
      });
      expect(rows.find((row) => row.name === "Draw")?.outcome).toBe("draw");
      expect(rows.find((row) => row.name === "Loss")?.outcome).toBe("lost");
      expect(rows.find((row) => row.name === "Older win")?.outcome).toBe("won");
      expect(
        rows.find((row) => row.name === "Fallback time")?.displayTime,
      ).toEqual(new Date("2026-08-20T18:00:00.000Z"));
    } finally {
      await close();
    }
  });
});
