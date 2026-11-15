import { eq } from "drizzle-orm";

import {
  GamePositionEnum,
  courts,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  matches,
  matchSets,
  user,
  venues,
} from "@repo/db/schema";
import { type TestDatabase } from "@repo/db/testing";

import { createGame } from "#src/routers/games/create";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function insertPartnerVenue(database: TestDatabase) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
      partnerAt: new Date("2026-11-01T10:00:00.000Z"),
    })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const [court] = await database
    .insert(courts)
    .values({ venueId: venue.id, name: "1", sport: "padel" })
    .returning({ id: courts.id });
  if (!court) {
    throw new Error("Failed to insert court");
  }
  return { venueId: venue.id, courtId: court.id };
}

async function seat(
  database: TestDatabase,
  args: { gameId: string; sideIndex: number; userIds: [string, string] },
) {
  const [team] = await database
    .insert(gameTeams)
    .values({ gameId: args.gameId, sideIndex: args.sideIndex })
    .returning({ id: gameTeams.id });
  if (!team) {
    throw new Error("Failed to insert game team");
  }
  const positions = [GamePositionEnum.LEFT, GamePositionEnum.RIGHT] as const;
  for (const [index, userId] of args.userIds.entries()) {
    const [player] = await database
      .insert(gamePlayers)
      .values({ gameId: args.gameId, userId })
      .returning({ id: gamePlayers.id });
    if (!player) {
      throw new Error("Failed to insert game player");
    }
    await database.insert(gameTeamPlayers).values({
      gameTeamId: team.id,
      gamePlayerId: player.id,
      position: positions[index]!,
    });
  }
  return team.id;
}

/**
 * A Public Game at a partner Venue with its four seats taken: the creator
 * and `b` on side 1, `c` and `d` on side 2.
 */
export async function seatedPublicGame(database: TestDatabase) {
  const [creator, b, c, d] = await Promise.all(
    ["creator", "b", "c", "d"].map((name) => insertUser(database, name)),
  );
  const { venueId, courtId } = await insertPartnerVenue(database);
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  const created = await createGame(
    database as unknown as Parameters<typeof createGame>[0],
    {
      createdBy: creator!,
      isPublic: true,
      format: "friendly_game",
      registrationMode: "individual",
      venueId,
      courtId,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
    },
  );
  const match = await database.query.matches.findFirst({
    where: eq(matches.gameId, created.id),
  });
  if (!match) {
    throw new Error("Expected the Public Game's Match");
  }
  const slot1GameTeamId = await seat(database, {
    gameId: created.id,
    sideIndex: 1,
    userIds: [creator!, b!],
  });
  const slot2GameTeamId = await seat(database, {
    gameId: created.id,
    sideIndex: 2,
    userIds: [c!, d!],
  });
  await database
    .update(matches)
    .set({ slot1GameTeamId, slot2GameTeamId })
    .where(eq(matches.id, match.id));
  const sets = await database.query.matchSets.findMany({
    where: eq(matchSets.matchId, match.id),
    orderBy: (table, { asc }) => [asc(table.setNumber)],
  });
  const firstSet = sets[0];
  if (!firstSet) {
    throw new Error("Expected a Set shell");
  }
  return {
    gameId: created.id,
    matchId: match.id,
    setId: firstSet.id,
    creator: creator!,
    b: b!,
    c: c!,
    d: d!,
  };
}
