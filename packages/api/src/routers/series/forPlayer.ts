import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";

import { gamePlayers, games, groupSeries, user } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  matchHistoryHidden,
  mayViewPlayer,
} from "#src/routers/users/playerProfile";
import { canOpenSeries } from "#src/series/can-open-series";
import { loadSeriesEditions } from "#src/series/load-series-editions";
import {
  playerWinOf,
  playerWinTimes,
  playerWinWith,
  type PlayerSeriesWinWith,
} from "#src/series/player-series-wins";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const seriesForPlayerInput = z.object({
  userId: z.string().uuid(),
});

export type PlayerSeriesWin = {
  gameId: string;
  seriesId: string;
  edition: number;
  playedAt: Date;
  wonAt: Date;
  ordinal: number;
  with: PlayerSeriesWinWith;
};

const notFound = (locale: Locale) =>
  new TRPCError({
    code: "NOT_FOUND",
    message: messagesFor(locale).profile.errors.playerNotFound,
  });

/** The Games the player holds a seat on that have a Series and are not cancelled. */
async function seatedSeriesGameIds(database: DbClient, playerId: string) {
  const rows = await database
    .selectDistinct({ id: games.id })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .where(
      and(
        eq(gamePlayers.userId, playerId),
        isNotNull(games.seriesId),
        isNull(games.cancelledAt),
      ),
    );
  return rows.map((row) => row.id);
}

function newestFirst(left: PlayerSeriesWin, right: PlayerSeriesWin) {
  return (
    right.wonAt.getTime() - left.wonAt.getTime() || right.edition - left.edition
  );
}

/**
 * A player's Series wins for their profile card and Home's Latest: one badge
 * per Series won with its count, most recent win first, and every win newest
 * first with its nth place in the Series, counted in Edition order. The card
 * follows the Marks cabinet's rule: whoever may open the profile sees it,
 * unless the owner's Match history visibility excludes them.
 */
export async function seriesForPlayer(
  database: DbClient,
  args: {
    viewerId: string;
    playerId: string;
    getPublicMetadata?: () => Promise<Record<string, unknown> | undefined>;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  if (!(await mayViewPlayer(database, args))) {
    throw notFound(locale);
  }
  const owner = await database.query.user.findFirst({
    where: eq(user.id, args.playerId),
    columns: { id: true, matchHistoryVisibility: true },
  });
  if (!owner) {
    throw notFound(locale);
  }
  if (
    await matchHistoryHidden(database, {
      viewerId: args.viewerId,
      playerId: owner.id,
      visibility: owner.matchHistoryVisibility,
    })
  ) {
    return { hidden: true as const };
  }

  const editions = await loadSeriesEditions(database, {
    gameIds: await seatedSeriesGameIds(database, owner.id),
  });
  const countBySeries = new Map<string, number>();
  const wins: PlayerSeriesWin[] = editions.flatMap((edition) => {
    const times = playerWinTimes(edition);
    if (!playerWinOf(edition, owner.id) || !times) {
      return [];
    }
    const ordinal = (countBySeries.get(edition.game.seriesId) ?? 0) + 1;
    countBySeries.set(edition.game.seriesId, ordinal);
    return [
      {
        gameId: edition.game.id,
        seriesId: edition.game.seriesId,
        edition: edition.edition,
        ...times,
        ordinal,
        with: playerWinWith(edition, owner.id),
      },
    ];
  });
  wins.sort(newestFirst);

  const seriesIds = [...countBySeries.keys()];
  const seriesRows =
    seriesIds.length === 0
      ? []
      : await database.query.groupSeries.findMany({
          where: inArray(groupSeries.id, seriesIds),
          with: { group: true },
        });
  const openable = new Map(
    await Promise.all(
      [...new Map(seriesRows.map((row) => [row.group.id, row.group]))].map(
        async ([groupId, group]) =>
          [
            groupId,
            await canOpenSeries(
              database,
              group,
              args.viewerId,
              args.getPublicMetadata,
            ),
          ] as const,
      ),
    ),
  );
  const seriesById = new Map(seriesRows.map((row) => [row.id, row]));
  const badges = seriesIds.flatMap((seriesId) => {
    const series = seriesById.get(seriesId);
    const last = wins.find((win) => win.seriesId === seriesId);
    if (!series || !last) {
      return [];
    }
    return [
      {
        seriesId,
        name: series.name,
        emblem: series.emblem,
        colour: series.colour,
        groupName: series.group.name,
        wins: countBySeries.get(seriesId) ?? 0,
        lastWonAt: last.wonAt,
        canOpenSeries: openable.get(series.group.id) ?? false,
      },
    ];
  });
  badges.sort(
    (left, right) =>
      right.lastWonAt.getTime() - left.lastWonAt.getTime() ||
      left.name.localeCompare(right.name),
  );

  return {
    hidden: false as const,
    totalWins: wins.length,
    badges,
    wins,
  };
}

export const forPlayerProcedure = protectedProcedure
  .input(seriesForPlayerInput)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return seriesForPlayer(ctx.db, {
      viewerId: appUser.id,
      playerId: input.userId,
      getPublicMetadata: ctx.getPublicMetadata,
      locale: ctx.locale,
    });
  });
