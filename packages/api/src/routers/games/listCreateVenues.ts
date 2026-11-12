import type { Db, DbClient, DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { gamePlayers, games, venues } from "@repo/db";

import { DEFAULT_SPORT, sportOrDefault, type Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
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
  locale: Locale = DEFAULT_LOCALE,
  partnerOnly = false,
): Promise<{
  locked: boolean;
  groupKind: GameCreateGroupKind;
  venues: GameCreateVenueOption[];
}> {
  const context = await loadGameCreateVenueContext(database, groupId, locale);
  const ofSport = (court: { sport: Sport }) =>
    sport == null || court.sport === sport;
  const offersFootball = (venue: { courts: { sport: Sport }[] }) =>
    sport !== "football" || venue.courts.some(ofSport);
  const hostsPublicGames = (venue: {
    partnerAt: Date | null;
    courts: { sport: Sport }[];
  }) => venue.partnerAt !== null && venue.courts.some(ofSport);

  if (context.locked && context.linkedVenueId) {
    const venue = await database.query.venues.findFirst({
      where: eq(venues.id, context.linkedVenueId),
      columns: {
        id: true,
        name: true,
        city: true,
        country: true,
        archivedAt: true,
        partnerAt: true,
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
        message: messagesFor(locale).venue.errors.notFound,
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
          isPartner: venue.partnerAt !== null,
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
      partnerAt: true,
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
    venues: rows
      .filter(partnerOnly ? hostsPublicGames : offersFootball)
      .map((venue) => ({
        id: venue.id,
        name: venue.name,
        city: venue.city,
        country: venue.country,
        archivedAt: venue.archivedAt,
        isPartner: venue.partnerAt !== null,
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

/**
 * The Venues a Game may be created at. With `publicGame` and no Group, only
 * partner Venues that offer the Public Game's sport, padel unless `sport`
 * says otherwise (ADR-0071).
 */
export async function listCreateVenuesForUser(
  database: DbOrTx,
  args: {
    userId: string;
    groupId?: string;
    publicGame?: boolean;
    sport?: Sport;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const publicGame = !args.groupId && args.publicGame === true;
  let sport: Sport | null = publicGame ? (args.sport ?? DEFAULT_SPORT) : null;
  if (args.groupId) {
    const group = await requireGroup(database, args.groupId, locale);
    await assertMayCreateGameOnGroup(database, group, args.userId, locale);
    sport = sportOrDefault(group.sport);
  }
  const [catalog, recentCourtIds] = await Promise.all([
    listVenuesForGameCreate(database, args.groupId, sport, locale, publicGame),
    listRecentCourtIds(database, args.userId),
  ]);
  return { ...catalog, recentCourtIds };
}

export const listCreateVenues = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid().optional(),
      publicGame: z.boolean().optional(),
      /** A Public Game's sport. Omitted = padel. */
      sport: sportSchema.optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listCreateVenuesForUser(ctx.db, {
      userId: appUser.id,
      groupId: input.groupId,
      publicGame: input.publicGame,
      sport: input.sport,
      locale: ctx.locale,
    });
  });
