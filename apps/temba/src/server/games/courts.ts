import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";

import { courts, gameCourts, gameTeams, venues } from "@repo/db";

import { type db } from "~/server/db";
import { type GameRow } from "~/server/games/access";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function venueForGame(database: DbClient, venueId: string) {
  return database.query.venues.findFirst({
    where: eq(venues.id, venueId),
    columns: { id: true, archivedAt: true, name: true },
  });
}

async function recordedCourtIdsForGame(database: DbClient, gameId: string) {
  const rows = await database.query.gameCourts.findMany({
    where: eq(gameCourts.gameId, gameId),
    columns: { courtId: true },
  });
  if (rows.length === 0) {
    return null;
  }
  return rows.map((row) => row.courtId);
}

export async function listAssignableCourts(database: DbClient, game: GameRow) {
  const venue = await venueForGame(database, game.venueId);
  if (!venue || venue.archivedAt) {
    return [];
  }

  const recordedCourtIds = await recordedCourtIdsForGame(database, game.id);
  const rows = await database.query.courts.findMany({
    where:
      recordedCourtIds == null
        ? eq(courts.venueId, venue.id)
        : and(
            eq(courts.venueId, venue.id),
            inArray(courts.id, recordedCourtIds),
          ),
    columns: { id: true, name: true, venueId: true },
    orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    venueId: row.venueId,
    venueName: venue.name,
  }));
}

export async function assertCourtAssignable(
  database: DbClient,
  game: GameRow,
  courtId: string,
) {
  const court = await database.query.courts.findFirst({
    where: eq(courts.id, courtId),
    columns: { id: true, venueId: true },
  });
  if (!court) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Court not found",
    });
  }

  const venue = await venueForGame(database, game.venueId);
  if (!venue) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Venue not found",
    });
  }
  if (venue.archivedAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot assign a Court on an archived Venue",
    });
  }
  if (court.venueId !== game.venueId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Court must belong to this Game's Venue",
    });
  }

  const recordedCourtIds = await recordedCourtIdsForGame(database, game.id);
  if (recordedCourtIds != null && !recordedCourtIds.includes(courtId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Court must be one of the Courts recorded on this Game",
    });
  }
}

export async function assertGameTeamOnGame(
  database: DbClient,
  gameId: string,
  gameTeamId: string,
) {
  const row = await database.query.gameTeams.findFirst({
    where: and(eq(gameTeams.id, gameTeamId), eq(gameTeams.gameId, gameId)),
    columns: { id: true },
  });
  if (!row) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Game team is not on this Game",
    });
  }
}
