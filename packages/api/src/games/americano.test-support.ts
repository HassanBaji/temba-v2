import { eq } from "drizzle-orm";

import { courts, gamePlayers, groups, user, venues } from "@repo/db/schema";
import type { TestDatabase } from "@repo/db/testing";

import { type db } from "#src/db";
import { createTournament } from "#src/routers/games/createTournament";
import { register } from "#src/routers/games/register";

export function asDb(database: TestDatabase): typeof db {
  return database as unknown as typeof db;
}

export async function insertAmericanoUser(
  database: TestDatabase,
  name: string,
) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

export async function insertAmericanoPlayers(
  database: TestDatabase,
  count: number,
) {
  const rows = [];
  for (let index = 0; index < count; index += 1) {
    rows.push(await insertAmericanoUser(database, `Player ${index + 1} Haji`));
  }
  return rows;
}

/** An open Americano on a fresh Verified Group, with `courtCount` Courts recorded. */
export async function insertAmericano(
  database: TestDatabase,
  args: {
    createdBy: string;
    players: number;
    rounds: number;
    windowStart: Date;
    windowEnd: Date;
    courtCount?: number;
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
    .values({ name: "World Padel Academy", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!group || !venue) {
    throw new Error("Failed to insert Group or Venue");
  }
  const courtRows = await database
    .insert(courts)
    .values(
      Array.from(
        { length: args.courtCount ?? args.players / 4 },
        (_, index) => ({
          venueId: venue.id,
          name: `Court ${index + 1}`,
        }),
      ),
    )
    .returning({ id: courts.id });
  const created = await createTournament(asDb(database), {
    createdBy: args.createdBy,
    name: "Sunday Social",
    groupId: group.id,
    isPublic: true,
    registrationMode: "individual",
    tournamentShape: "americano",
    teamCount: args.players / 2,
    roundCount: args.rounds,
    venueId: venue.id,
    courtIds: courtRows.map((court) => court.id),
    matchMinutes: 30,
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
  });
  return created.id;
}

/** Signs each player up alone and returns their Game player ids in sign-up order. */
export async function registerAmericanoPlayers(
  database: TestDatabase,
  gameId: string,
  players: readonly { id: string }[],
) {
  for (const player of players) {
    await register(asDb(database), { gameId, userId: player.id });
  }
  const rows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, gameId),
    columns: { id: true, userId: true, createdAt: true },
  });
  return players.map(
    (player) => rows.find((row) => row.userId === player.id)?.id ?? "",
  );
}
