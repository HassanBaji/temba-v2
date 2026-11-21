import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groupSeries } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { seriesWinRule } from "@repo/domain/series";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, requireGame } from "#src/games/access";
import { canOpenSeries } from "#src/series/can-open-series";
import {
  loadSeriesEditions,
  type SeriesEdition,
  type SeriesEditionWinner,
} from "#src/series/load-series-editions";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const seriesEditionInput = z.object({
  gameId: z.string().uuid(),
});

type Standing = {
  standing: "new" | "most" | "level" | null;
  levelWith: { name: string } | { count: number } | null;
};

/** Wins per User up to and including this Edition, in Edition order; Guest players left out. */
function winsUpTo(editions: readonly SeriesEdition[], edition: number) {
  const tally = new Map<string, { name: string; wins: number }>();
  for (const entry of editions) {
    if (entry.edition > edition) {
      continue;
    }
    for (const winner of entry.winners) {
      if (winner.isGuest) {
        continue;
      }
      const row = tally.get(winner.userId) ?? { name: winner.name, wins: 0 };
      row.wins += 1;
      tally.set(winner.userId, row);
    }
  }
  return tally;
}

function standingOf(
  winner: SeriesEditionWinner,
  winCount: number,
  tally: ReadonlyMap<string, { name: string; wins: number }>,
): Standing {
  if (winner.isGuest) {
    return { standing: null, levelWith: null };
  }
  if (winCount === 1) {
    return { standing: "new", levelWith: null };
  }
  const others = [...tally.entries()]
    .filter(([userId]) => userId !== winner.userId)
    .map(([, row]) => row);
  const best = Math.max(0, ...others.map((row) => row.wins));
  if (winCount > best) {
    return { standing: "most", levelWith: null };
  }
  if (winCount < best) {
    return { standing: null, levelWith: null };
  }
  const level = others.filter((row) => row.wins === winCount);
  return {
    standing: "level",
    levelWith:
      level.length === 1 && level[0]
        ? { name: level[0].name }
        : { count: level.length },
  };
}

/**
 * The Game screen's Series card: the Series and the Edition this Game is,
 * the rule that wins it, who won the last one, and once it is won, each
 * winner's count of this Series and where it leaves them. Counts and
 * standings are read as of this Edition, in Edition order. Null when the Game
 * has no Series or is cancelled.
 */
export async function seriesEdition(
  database: DbClient,
  args: z.infer<typeof seriesEditionInput> & {
    userId: string;
    getPublicMetadata?: () => Promise<Record<string, unknown> | undefined>;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  if (!game.seriesId || game.cancelledAt) {
    return null;
  }
  const series = await database.query.groupSeries.findFirst({
    where: eq(groupSeries.id, game.seriesId),
    with: { group: true },
  });
  if (!series) {
    return null;
  }

  const [editions, openable] = await Promise.all([
    loadSeriesEditions(database, { seriesIds: [series.id] }),
    canOpenSeries(database, series.group, args.userId, args.getPublicMetadata),
  ]);
  const current = editions.find((entry) => entry.game.id === game.id);
  if (!current) {
    return null;
  }
  const lastWon = editions
    .filter(
      (entry) =>
        entry.edition < current.edition && entry.result.state === "won",
    )
    .at(-1);
  const tally = winsUpTo(editions, current.edition);

  return {
    series: {
      id: series.id,
      name: series.name,
      emblem: series.emblem,
      colour: series.colour,
      groupName: series.group.name,
      endedAt: series.endedAt,
    },
    edition: current.edition,
    rule: seriesWinRule(game),
    state: current.result.state,
    lastWinners: lastWon
      ? {
          edition: lastWon.edition,
          winners: lastWon.winners.map((winner) => ({ name: winner.name })),
          winnerBib: lastWon.winnerBib,
        }
      : null,
    winners: current.winners.map((winner) => {
      const winCount = editions.filter(
        (entry) =>
          entry.edition <= current.edition &&
          entry.winners.some((each) => each.userId === winner.userId),
      ).length;
      return {
        userId: winner.userId,
        name: winner.name,
        image: winner.image,
        isViewer: winner.userId === args.userId,
        isGuest: winner.isGuest,
        gameTeamId: winner.gameTeamId,
        winCount,
        ...standingOf(winner, winCount, tally),
      };
    }),
    winnerBib: current.winnerBib,
    canOpenSeries: openable,
  };
}

export const editionProcedure = protectedProcedure
  .input(seriesEditionInput)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return seriesEdition(ctx.db, {
      ...input,
      userId: appUser.id,
      getPublicMetadata: ctx.getPublicMetadata,
      locale: ctx.locale,
    });
  });
