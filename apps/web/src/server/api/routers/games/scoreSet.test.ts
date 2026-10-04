import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GamePositionEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  groups,
  matches,
  matchSets,
  user,
  venues,
} from "@repo/db/schema";

import { scoreSet } from "~/server/api/routers/games/scoreSet";
import { createFriendlyGame } from "~/server/games/create-friendly";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "Test User", email })
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
    .returning();
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function seatFriendlyMatch(
  database: TestDatabase,
  args: {
    gameId: string;
    matchId: string;
    slot1: { left: { id: string }; right: { id: string } };
    slot2: { left: { id: string }; right: { id: string } };
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
    })
    .where(eq(matches.id, args.matchId));

  return { slot1TeamId: slot1Team.id, slot2TeamId: slot2Team.id };
}

async function insertGroup(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(groups)
    .values({ name: `Group ${crypto.randomUUID()}`, createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function setUpSeatedFriendlyMatch(database: TestDatabase) {
  const [a, b, c, d, outsider] = await Promise.all([
    insertUser(database, `a-${crypto.randomUUID()}@example.com`),
    insertUser(database, `b-${crypto.randomUUID()}@example.com`),
    insertUser(database, `c-${crypto.randomUUID()}@example.com`),
    insertUser(database, `d-${crypto.randomUUID()}@example.com`),
    insertUser(database, `outsider-${crypto.randomUUID()}@example.com`),
  ]);
  if (!a || !b || !c || !d || !outsider) {
    throw new Error("Failed to insert Users");
  }
  const venue = await insertVenue(database);
  const group = await insertGroup(database, a.id);
  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

  const created = await createFriendlyGame(database, {
    createdBy: a.id,
    groupId: group.id,
    venueId: venue.id,
    windowStart,
    windowEnd,
  });

  await seatFriendlyMatch(database, {
    gameId: created.game.id,
    matchId: created.matchId,
    slot1: { left: a, right: b },
    slot2: { left: c, right: d },
  });

  const sets = await database.query.matchSets.findMany({
    where: eq(matchSets.matchId, created.matchId),
  });

  return {
    game: created.game,
    matchId: created.matchId,
    sets,
    a,
    b,
    c,
    d,
    outsider,
  };
}

describe("scoreSet bounds", () => {
  it.each([
    [8, 0],
    [0, 8],
    [-1, 0],
  ])("refuses %i to %i", async (slot1GamesWon, slot2GamesWon) => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a } = await setUpSeatedFriendlyMatch(db);
      const firstSet = sets[0];
      if (!firstSet) {
        throw new Error("Expected a Set shell");
      }
      await expect(
        scoreSet(db, {
          gameId: game.id,
          matchId,
          setId: firstSet.id,
          userId: a.id,
          slot1GamesWon,
          slot2GamesWon,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    } finally {
      await close();
    }
  });

  it.each([
    [7, 7],
    [0, 0],
  ])("accepts %i to %i", async (slot1GamesWon, slot2GamesWon) => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a } = await setUpSeatedFriendlyMatch(db);
      const firstSet = sets[0];
      if (!firstSet) {
        throw new Error("Expected a Set shell");
      }
      await expect(
        scoreSet(db, {
          gameId: game.id,
          matchId,
          setId: firstSet.id,
          userId: a.id,
          slot1GamesWon,
          slot2GamesWon,
        }),
      ).resolves.toEqual({ ok: true });
    } finally {
      await close();
    }
  });
});
