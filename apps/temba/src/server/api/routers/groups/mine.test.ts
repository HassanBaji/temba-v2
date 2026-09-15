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
  groupMembers,
  groups,
  matchSets,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { mine } from "~/server/api/routers/groups/mine";
import { nextMatchSetNumber } from "~/server/games/next-match-set-number";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

const NOW = new Date("2026-09-15T12:00:00.000Z");
const PAST_START = new Date("2026-09-01T18:00:00.000Z");
const PAST_END = new Date("2026-09-01T20:00:00.000Z");
const NEXT_START = new Date("2026-09-17T18:00:00.000Z");
const NEXT_END = new Date("2026-09-17T20:00:00.000Z");
const LATER_START = new Date("2026-09-24T18:00:00.000Z");
const LATER_END = new Date("2026-09-24T20:00:00.000Z");

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id, name: user.name });
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
  args: {
    name: string;
    createdBy: string;
    members?: {
      userId: string;
      totalSetsWon?: number;
      totalPointsWon?: number;
      totalGamesPlayed?: number;
    }[];
  },
) {
  const [row] = await database
    .insert(groups)
    .values({ name: args.name, createdBy: args.createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  for (const member of args.members ?? []) {
    await database.insert(groupMembers).values({
      groupId: row.id,
      userId: member.userId,
      totalSetsWon: member.totalSetsWon ?? 0,
      totalPointsWon: member.totalPointsWon ?? 0,
      totalGamesPlayed: member.totalGamesPlayed ?? 0,
    });
  }
  return row;
}

async function insertGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    groupId: string;
    windowStart: Date;
    windowEnd: Date;
  },
) {
  const [game] = await database
    .insert(games)
    .values({
      name: "Session",
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      createdBy: args.createdBy,
      groupId: args.groupId,
      isPublic: false,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart: args.windowStart,
      windowEnd: args.windowEnd,
    })
    .returning({ id: games.id });
  if (!game) {
    throw new Error("Failed to insert game");
  }
  const [match] = await database
    .insert(matches)
    .values({ gameId: game.id, startTime: args.windowStart })
    .returning({ id: matches.id });
  if (!match) {
    throw new Error("Failed to insert match");
  }
  return { gameId: game.id, matchId: match.id };
}

/** Seats one player per slot on the Match and scores it. */
async function seatAndScore(
  database: TestDatabase,
  args: {
    gameId: string;
    matchId: string;
    slot1UserId: string;
    slot2UserId: string;
    sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
    status?: (typeof MatchStatusEnum)[keyof typeof MatchStatusEnum];
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

  async function occupy(gameTeamId: string, userId: string) {
    const [player] = await database
      .insert(gamePlayers)
      .values({ gameId: args.gameId, userId })
      .returning({ id: gamePlayers.id });
    if (!player) {
      throw new Error("Failed to insert game player");
    }
    await database.insert(gameTeamPlayers).values({
      gameTeamId,
      gamePlayerId: player.id,
      position: GamePositionEnum.LEFT,
    });
  }

  await occupy(slot1Team.id, args.slot1UserId);
  await occupy(slot2Team.id, args.slot2UserId);

  await database
    .update(matches)
    .set({
      slot1GameTeamId: slot1Team.id,
      slot2GameTeamId: slot2Team.id,
      status: args.status ?? MatchStatusEnum.COMPLETED,
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

describe("groups.mine list facts", () => {
  it("returns member count, the viewer's rank, the soonest upcoming Game, and the viewer's form", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "mine-viewer@example.com");
      const leader = await insertUser(db, "mine-leader@example.com");
      const rival = await insertUser(db, "mine-rival@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, {
        name: "Tuesday Crew",
        createdBy: viewer.id,
        members: [
          { userId: viewer.id, totalSetsWon: 3, totalGamesPlayed: 2 },
          { userId: leader.id, totalSetsWon: 9, totalGamesPlayed: 5 },
          { userId: rival.id, totalSetsWon: 1, totalGamesPlayed: 1 },
        ],
      });

      const won = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        windowStart: PAST_START,
        windowEnd: PAST_END,
      });
      await seatAndScore(db, {
        gameId: won.gameId,
        matchId: won.matchId,
        slot1UserId: viewer.id,
        slot2UserId: rival.id,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 2 }],
      });

      const lost = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        windowStart: new Date(PAST_START.getTime() + 60 * 60 * 1000),
        windowEnd: new Date(PAST_END.getTime() + 60 * 60 * 1000),
      });
      await seatAndScore(db, {
        gameId: lost.gameId,
        matchId: lost.matchId,
        slot1UserId: rival.id,
        slot2UserId: viewer.id,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 4 }],
      });

      // Two upcoming Games: the row reads the soonest one.
      await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        windowStart: LATER_START,
        windowEnd: LATER_END,
      });
      await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        windowStart: NEXT_START,
        windowEnd: NEXT_END,
      });

      const rows = await mine(db, { userId: viewer.id, now: NOW });

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: group.id,
        name: "Tuesday Crew",
        memberCount: 3,
        standingPosition: 2,
      });
      expect(rows[0]?.nextGameStartTime).toEqual(NEXT_START);
      // Fewer than five results render fewer marks; no padding.
      expect(rows[0]?.formMarks).toEqual(["won", "lost"]);
    } finally {
      await close();
    }
  });

  it("omits the rank and the next Game when the viewer has no results and the Group has none scheduled", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "mine-newcomer@example.com");
      const other = await insertUser(db, "mine-other@example.com");
      const group = await insertGroup(db, {
        name: "Office League",
        createdBy: other.id,
        members: [
          { userId: other.id, totalSetsWon: 4, totalGamesPlayed: 3 },
          { userId: viewer.id },
        ],
      });

      const rows = await mine(db, { userId: viewer.id, now: NOW });

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: group.id,
        memberCount: 2,
        standingPosition: null,
        nextGameStartTime: null,
      });
      expect(rows[0]?.formMarks).toEqual([]);
    } finally {
      await close();
    }
  });

  it("reads a constant number of queries however many Groups the viewer is in", async () => {
    const { db, client, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "mine-counter@example.com");
      const rival = await insertUser(db, "mine-counter-rival@example.com");
      const venue = await insertVenue(db);

      async function groupWithGame(name: string) {
        const group = await insertGroup(db, {
          name,
          createdBy: viewer.id,
          members: [
            { userId: viewer.id, totalSetsWon: 2, totalGamesPlayed: 1 },
          ],
        });
        const played = await insertGame(db, {
          createdBy: viewer.id,
          venueId: venue.id,
          groupId: group.id,
          windowStart: PAST_START,
          windowEnd: PAST_END,
        });
        await seatAndScore(db, {
          gameId: played.gameId,
          matchId: played.matchId,
          slot1UserId: viewer.id,
          slot2UserId: rival.id,
          sets: [{ slot1GamesWon: 6, slot2GamesWon: 1 }],
        });
        await insertGame(db, {
          createdBy: viewer.id,
          venueId: venue.id,
          groupId: group.id,
          windowStart: NEXT_START,
          windowEnd: NEXT_END,
        });
        return group;
      }

      const original = client.query.bind(client);
      let queryCount = 0;
      // Drizzle's pglite driver runs every statement through `client.query`.
      client.query = ((...callArgs: Parameters<typeof original>) => {
        queryCount += 1;
        return original(...callArgs);
      }) as typeof client.query;

      await groupWithGame("One");
      queryCount = 0;
      const oneGroup = await mine(db, { userId: viewer.id, now: NOW });
      const oneGroupQueries = queryCount;

      await groupWithGame("Two");
      await groupWithGame("Three");
      queryCount = 0;
      const threeGroups = await mine(db, { userId: viewer.id, now: NOW });
      const threeGroupQueries = queryCount;

      expect(oneGroup).toHaveLength(1);
      expect(threeGroups).toHaveLength(3);
      expect(oneGroupQueries).toBe(3);
      expect(threeGroupQueries).toBe(oneGroupQueries);
    } finally {
      await close();
    }
  });
});
