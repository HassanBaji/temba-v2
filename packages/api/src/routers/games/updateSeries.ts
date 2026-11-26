import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games, groups } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  requireNotChallengeGame,
} from "#src/games/access";
import {
  resolveGameSeriesLink,
  seriesLinkLocked,
} from "#src/series/series-link";

type DbClient = typeof db;

/**
 * Adds, changes or removes a Game's Series from Edit game. Once the score is
 * in the link is locked both ways; sending the Series it already has is a
 * no-op, so a Game whose Series has since ended can be saved unchanged.
 */
export async function updateGameSeries(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    seriesId: string | null;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.editCancelled,
    });
  }
  if (args.seriesId === game.seriesId) {
    return { ok: true as const, seriesId: game.seriesId };
  }
  if (await seriesLinkLocked(database, game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).series.errors.scoreIn,
    });
  }
  if (args.seriesId !== null) {
    const group = game.groupId
      ? ((await database.query.groups.findFirst({
          where: eq(groups.id, game.groupId),
          columns: { id: true, verifiedAt: true, venueId: true },
        })) ?? null)
      : null;
    await resolveGameSeriesLink(database, {
      game,
      group,
      seriesId: args.seriesId,
      locale,
    });
  }
  await database
    .update(games)
    .set({ seriesId: args.seriesId, updatedAt: new Date() })
    .where(eq(games.id, game.id));
  return { ok: true as const, seriesId: args.seriesId };
}

export const updateSeries = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      seriesId: z.string().uuid().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateGameSeries(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      seriesId: input.seriesId,
      locale: ctx.locale,
    });
  });
