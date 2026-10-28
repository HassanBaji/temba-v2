import type { Db, DbClient, DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { gamePlayers, games, venues } from "@repo/db";

import { sportOrDefault, type Sport } from "@repo/domain/sport";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { assertMayCreateGameOnGroup } from "#src/games/access";
import { loadGameCreateVenueContext } from "#src/games/helpers/load-game-create-venue-context";
import { requireGroup } from "#src/games/helpers/require-group";
import type {
  GameCreateGroupKind,
  GameCreateVenueOption,
} from "#src/games/utils";
import { consult } from "#src/soft-archive";
import { liveVenuesWhere } from "#src/soft-archive/adapter";

type DbOrTx = Db | DbTx;

type RecentCourtDb = DbClient | DbTx;

const RECENT_BOOKING_LIMIT = 40;

async function listVenuesForGameCreate(
  database: DbOrTx,
  groupId: string | undefined,
  sport: Sport | null,
): Promise<{
  locked: boolean;
  groupKind: GameCreateGroupKind;
  venues: GameCreateVenueOption[];
}> {
  const context = await loadGameCreateVenueContext(database, groupId);
  const ofSport = (court: { sport: Sport }) =>
    sport == null || court.sport === sport;
  const offersFootball = (venue: { courts: { sport: Sport }[] }) =>
    sport !== "football" || venue.courts.some(ofSport);

  if (context.locked && context.linkedVenueId) {
    const venue = await database.query.venues.findFirst({
      where: eq(venues.id, context.linkedVenueId),
      columns: {
        id: true,
        name: true,
        city: true,
        country: true,
        archivedAt: true,
      },
      with: {
        courts: {
          columns: { id: true, name: true, sport: true },
          orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
        },
      },
    });
    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Venue not found",
      });
    }

    const archived = consult({ archivedAt: venue.archivedAt }).freeze(
      "catalog",
    );
    return {
      locked: true,
      groupKind: context.groupKind,
      venues: [
        {
          id: venue.id,
          name: venue.name,
          city: venue.city,
          country: venue.country,
          archivedAt: venue.archivedAt,
          courts: archived ? [] : venue.courts.filter(ofSport),
        },
      ],
    };
  }

  const rows = await database.query.venues.findMany({
    where: liveVenuesWhere(),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      archivedAt: true,
    },
    with: {
      courts: {
        columns: { id: true, name: true, sport: true },
        orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
      },
    },
    orderBy: (table, { asc }) => [
      asc(table.name),
      asc(table.city),
      asc(table.country),
      asc(table.id),
    ],
  });

  return {
    locked: false,
    groupKind: context.groupKind,
    venues: rows.filter(offersFootball).map((venue) => ({
      id: venue.id,
      name: venue.name,
      city: venue.city,
      country: venue.country,
      archivedAt: venue.archivedAt,
      courts: venue.courts.filter(ofSport),
    })),
  };
}

export async function listRecentCourtIds(
  database: RecentCourtDb,
  userId: string,
): Promise<string[]> {
  const played = await database
    .select({ gameId: gamePlayers.gameId })
    .from(gamePlayers)
    .where(eq(gamePlayers.userId, userId));
  const playedIds = played.map((row) => row.gameId);
  const involved =
    playedIds.length > 0
      ? or(eq(games.createdBy, userId), inArray(games.id, playedIds))
      : eq(games.createdBy, userId);

  const rows = await database.query.games.findMany({
    where: and(
      involved,
      isNull(games.cancelledAt),
      isNotNull(games.windowStart),
    ),
    columns: { id: true },
    with: {
      matches: {
        columns: { courtId: true },
        orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
      },
      gameCourts: {
        columns: { courtId: true },
        orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
      },
    },
    orderBy: (table, { desc }) => [desc(table.windowStart), desc(table.id)],
    limit: RECENT_BOOKING_LIMIT,
  });

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const game of rows) {
    const courtIds = [
      ...game.matches.map((match) => match.courtId),
      ...game.gameCourts.map((court) => court.courtId),
    ];
    for (const courtId of courtIds) {
      if (!courtId || seen.has(courtId)) {
        continue;
      }
      seen.add(courtId);
      ids.push(courtId);
    }
  }
  return ids;
}

export async function listCreateVenuesForUser(
  database: DbOrTx,
  args: { userId: string; groupId?: string },
) {
  let sport: Sport | null = null;
  if (args.groupId) {
    const group = await requireGroup(database, args.groupId);
    await assertMayCreateGameOnGroup(database, group, args.userId);
    sport = sportOrDefault(group.sport);
  }
  const [catalog, recentCourtIds] = await Promise.all([
    listVenuesForGameCreate(database, args.groupId, sport),
    listRecentCourtIds(database, args.userId),
  ]);
  return { ...catalog, recentCourtIds };
}

export const listCreateVenues = protectedProcedure
  .input(z.object({ groupId: z.string().uuid().optional() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listCreateVenuesForUser(ctx.db, {
      userId: appUser.id,
      groupId: input.groupId,
    });
  });
