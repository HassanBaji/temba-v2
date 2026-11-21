import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groupSeries, user } from "@repo/db";
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
} from "#src/series/player-series-wins";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const seriesPlayerWinsInput = z.object({
  userId: z.string().uuid(),
  seriesId: z.string().uuid(),
});

const notFound = (locale: Locale) =>
  new TRPCError({
    code: "NOT_FOUND",
    message: messagesFor(locale).profile.errors.playerNotFound,
  });

/**
 * The wins behind one badge on a profile (design 4b): how many of the Series'
 * decided Editions the player won and how many they played, and each win
 * newest first. A deleted Group's Series still answers, so the badge it left
 * on a profile opens; a hidden profile is the profile's not-found.
 */
export async function seriesPlayerWins(
  database: DbClient,
  args: z.infer<typeof seriesPlayerWinsInput> & {
    viewerId: string;
    getPublicMetadata?: () => Promise<Record<string, unknown> | undefined>;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const playerId = args.userId;
  if (!(await mayViewPlayer(database, { viewerId: args.viewerId, playerId }))) {
    throw notFound(locale);
  }
  const owner = await database.query.user.findFirst({
    where: eq(user.id, playerId),
    columns: { id: true, matchHistoryVisibility: true },
  });
  if (
    !owner ||
    (await matchHistoryHidden(database, {
      viewerId: args.viewerId,
      playerId: owner.id,
      visibility: owner.matchHistoryVisibility,
    }))
  ) {
    throw notFound(locale);
  }
  const series = await database.query.groupSeries.findFirst({
    where: eq(groupSeries.id, args.seriesId),
    with: { group: true },
  });
  if (!series) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).series.errors.notFound,
    });
  }

  const [editions, openable] = await Promise.all([
    loadSeriesEditions(database, { seriesIds: [series.id] }),
    canOpenSeries(
      database,
      series.group,
      args.viewerId,
      args.getPublicMetadata,
    ),
  ]);
  const decided = editions.filter(
    (edition) => edition.result.state !== "upcoming",
  );
  const won = decided.flatMap((edition) => {
    const times = playerWinTimes(edition);
    return playerWinOf(edition, owner.id) && times
      ? [
          {
            gameId: edition.game.id,
            edition: edition.edition,
            playedAt: times.playedAt,
            with: playerWinWith(edition, owner.id),
          },
        ]
      : [];
  });

  return {
    series: {
      id: series.id,
      name: series.name,
      emblem: series.emblem,
      colour: series.colour,
      groupName: series.group.name,
    },
    wins: won.length,
    playedBySeries: decided.length,
    playedByPlayer: decided.filter((edition) =>
      edition.seatedUserIds.includes(owner.id),
    ).length,
    editions: won.reverse(),
    canOpenSeries: openable,
  };
}

export const playerWinsProcedure = protectedProcedure
  .input(seriesPlayerWinsInput)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return seriesPlayerWins(ctx.db, {
      ...input,
      viewerId: appUser.id,
      getPublicMetadata: ctx.getPublicMetadata,
      locale: ctx.locale,
    });
  });
