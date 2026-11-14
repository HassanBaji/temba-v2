import { eq } from "drizzle-orm";

import { gameTeams, groups, user, venues } from "@repo/db/schema";
import type { TestDatabase } from "@repo/db/testing";

import { type db } from "#src/db";
import { createTournament } from "#src/routers/games/createTournament";
import { registerSeat } from "#src/routers/games/registerSeat";

function asDb(database: TestDatabase): typeof db {
  return database as unknown as typeof db;
}

export async function insertKingUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

/** A King of the court Game on a fresh Verified Group, created by `createdBy`. */
export async function insertKingTournament(
  database: TestDatabase,
  args: {
    createdBy: string;
    courts: number;
    windowStart: Date;
    windowEnd: Date;
  },
) {
  const [group] = await database
    .insert(groups)
    .values({
      verifiedAt: new Date(),
      name: `Group ${crypto.randomUUID()}`,
      createdBy: args.createdBy,
    })
    .returning({ id: groups.id });
  const [venue] = await database
    .insert(venues)
    .values({ name: "Janabiyah Padel Park", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!group || !venue) {
    throw new Error("Failed to insert Group or Venue");
  }
  const created = await createTournament(asDb(database), {
    createdBy: args.createdBy,
    name: "Sunday Social",
    groupId: group.id,
    isPublic: true,
    registrationMode: "individual",
    tournamentShape: "king_of_the_court",
    teamCount: args.courts * 2,
    venueId: venue.id,
    matchMinutes: 45,
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
  });
  return created.id;
}

/** Seats complete Game teams, two players a side, and returns the team ids by side. */
export async function seatKingTeams(
  database: TestDatabase,
  gameId: string,
  players: readonly { id: string }[],
) {
  for (let index = 0; index * 2 + 1 < players.length; index += 1) {
    const left = players[index * 2];
    const right = players[index * 2 + 1];
    if (!left || !right) {
      continue;
    }
    await registerSeat(asDb(database), {
      gameId,
      userId: left.id,
      sideIndex: index + 1,
      position: "left",
    });
    await registerSeat(asDb(database), {
      gameId,
      userId: right.id,
      sideIndex: index + 1,
      position: "right",
    });
  }
  const rows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
    columns: { id: true, sideIndex: true },
  });
  return rows
    .filter((row) => row.sideIndex != null)
    .sort((left, right) => (left.sideIndex ?? 0) - (right.sideIndex ?? 0))
    .map((row) => row.id);
}

export async function insertKingPlayers(database: TestDatabase, count: number) {
  const rows = [];
  for (let index = 0; index < count; index += 1) {
    rows.push(await insertKingUser(database, `Player ${index + 1} Haji`));
  }
  return rows;
}
