import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { sportOrDefault } from "@repo/domain/sport";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertCanViewGroup } from "#src/groups/helpers/assert-can-view-group";
import { isGroupApprover } from "#src/groups/helpers/is-group-approver";
import {
  loadSeriesEditions,
  seriesEditionWindowEnded,
  type SeriesEdition,
} from "#src/series/load-series-editions";
import { requireSeries, seriesHasGame } from "#src/series/series-link";

type DbClient = typeof db;

export const seriesByIdInput = z.object({
  id: z.string().uuid(),
});

type MostWinsRow = {
  userId: string;
  name: string;
  image: string | null;
  wins: number;
  lastWonEdition: number;
  isViewer: boolean;
};

function editionState(
  edition: SeriesEdition,
  now: Date,
): "upcoming" | "awaiting" | "no_winner" | "won" {
  if (edition.result.state !== "upcoming") {
    return edition.result.state;
  }
  return seriesEditionWindowEnded(edition.game, now) ? "awaiting" : "upcoming";
}

/** Every winner with an account, by wins, then the more recent win, then name. */
function mostWins(editions: readonly SeriesEdition[], viewerUserId: string) {
  const byUser = new Map<string, MostWinsRow>();
  for (const edition of editions) {
    for (const winner of edition.winners) {
      if (winner.isGuest) {
        continue;
      }
      const row = byUser.get(winner.userId) ?? {
        userId: winner.userId,
        name: winner.name,
        image: winner.image,
        wins: 0,
        lastWonEdition: 0,
        isViewer: winner.userId === viewerUserId,
      };
      row.wins += 1;
      row.lastWonEdition = Math.max(row.lastWonEdition, edition.edition);
      byUser.set(winner.userId, row);
    }
  }
  return [...byUser.values()].sort(
    (left, right) =>
      right.wins - left.wins ||
      right.lastWonEdition - left.lastWonEdition ||
      left.name.localeCompare(right.name),
  );
}

/**
 * A Series' page (design 3b): its badge and Group, how many Editions were
 * played and by how many different winners, who has won it most, and every
 * Edition newest first. Whoever may view the Group may read it; a Guest
 * player is named on their Edition and nowhere else.
 */
export async function seriesById(
  database: DbClient,
  args: z.infer<typeof seriesByIdInput> & {
    userId: string;
    now?: Date;
    getPublicMetadata?: () => Promise<Record<string, unknown> | undefined>;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const series = await requireSeries(database, args.id, locale);
  await assertCanViewGroup(
    database,
    series.group,
    args.userId,
    args.getPublicMetadata,
    locale,
  ).catch((error: unknown) => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).series.errors.notFound,
      });
    }
    throw error;
  });
  const now = args.now ?? new Date();

  const [approver, editions, hasGame] = await Promise.all([
    isGroupApprover(database, series.group, args.userId),
    loadSeriesEditions(database, { seriesIds: [series.id] }),
    seriesHasGame(database, series.id),
  ]);
  const winners = mostWins(editions, args.userId);

  return {
    id: series.id,
    name: series.name,
    emblem: series.emblem,
    colour: series.colour,
    sport: sportOrDefault(series.group.sport),
    group: { id: series.group.id, name: series.group.name },
    endedAt: series.endedAt,
    createdAt: series.createdAt,
    canEnd: approver && series.endedAt === null,
    endRemoves: !hasGame,
    playedCount: editions.filter(
      (edition) => edition.result.state !== "upcoming",
    ).length,
    differentWinners: winners.length,
    mostWins: winners,
    editions: [...editions]
      .sort((left, right) => right.edition - left.edition)
      .map((edition) => ({
        gameId: edition.game.id,
        edition: edition.edition,
        startsAt: edition.game.windowStart,
        state: editionState(edition, now),
        winners: edition.winners.map((winner) => ({
          userId: winner.userId,
          name: winner.name,
          isGuest: winner.isGuest,
        })),
        winnerBib: edition.winnerBib,
      })),
  };
}

export const byIdProcedure = protectedProcedure
  .input(seriesByIdInput)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return seriesById(ctx.db, {
      ...input,
      userId: appUser.id,
      getPublicMetadata: ctx.getPublicMetadata,
      locale: ctx.locale,
    });
  });
