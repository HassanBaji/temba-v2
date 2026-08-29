import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { communities, courts, gameTeams, groups, venues } from "@repo/db";

import { type db } from "~/server/db";
import { type GameRow } from "~/server/games/access";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function clubCommunityForGame(database: DbClient, game: GameRow) {
  if (!game.groupId) {
    return null;
  }
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, game.groupId),
    columns: { id: true, communityId: true },
  });
  if (!group?.communityId) {
    return null;
  }
  return database.query.communities.findFirst({
    where: eq(communities.id, group.communityId),
    columns: { id: true, venueId: true },
  });
}

export async function listAssignableCourts(database: DbClient, game: GameRow) {
  const club = await clubCommunityForGame(database, game);
  if (club) {
    if (!club.venueId) {
      return [];
    }
    const venue = await database.query.venues.findFirst({
      where: eq(venues.id, club.venueId),
      columns: { id: true, archivedAt: true, name: true },
    });
    if (!venue || venue.archivedAt) {
      return [];
    }
    const rows = await database.query.courts.findMany({
      where: eq(courts.venueId, venue.id),
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

  const liveVenues = await database.query.venues.findMany({
    where: isNull(venues.archivedAt),
    columns: { id: true, name: true },
    with: {
      courts: {
        columns: { id: true, name: true, venueId: true },
        orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
      },
    },
    orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
  });

  return liveVenues.flatMap((venue) =>
    venue.courts.map((court) => ({
      id: court.id,
      name: court.name,
      venueId: court.venueId,
      venueName: venue.name,
    })),
  );
}

export async function assertCourtAssignable(
  database: DbClient,
  game: GameRow,
  courtId: string,
) {
  const court = await database.query.courts.findFirst({
    where: eq(courts.id, courtId),
    with: {
      venue: {
        columns: { id: true, archivedAt: true, name: true },
      },
    },
  });
  if (!court) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Court not found",
    });
  }
  if (court.venue.archivedAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot assign a Court on an archived Venue",
    });
  }

  const club = await clubCommunityForGame(database, game);
  if (club) {
    if (!club.venueId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This Club Group has no linked Venue; skip Court",
      });
    }
    if (court.venueId !== club.venueId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Club Group Games can only use Courts on the linked Venue",
      });
    }
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
