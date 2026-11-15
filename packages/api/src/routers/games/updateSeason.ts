import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  requireNotChallengeGame,
} from "#src/games/access";
import { resolveGameSeasonLink } from "#src/games/season-link";

type DbClient = typeof db;

/**
 * Links a Group Game to one of its Group's Seasons, or unlinks it (design
 * "Edit game flow" 1b). The game day must fall inside the Season's window,
 * and nothing changes once the score is confirmed.
 */
export async function updateGameSeason(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    seasonId: string | null;
    now?: Date;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, args.locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.editCancelled,
    });
  }
  if (!game.windowStart) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.seasonNeedsDay,
    });
  }
  const season = await resolveGameSeasonLink(database, {
    game,
    locale: args.locale ?? DEFAULT_LOCALE,
    seasonId: args.seasonId,
    windowStart: game.windowStart,
    now: args.now ?? new Date(),
  });
  await database
    .update(games)
    .set({ seasonId: season?.id ?? null, updatedAt: new Date() })
    .where(eq(games.id, game.id));
  return { ok: true as const, seasonId: season?.id ?? null };
}

export const updateSeason = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      seasonId: z.string().uuid().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateGameSeason(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      seasonId: input.seasonId,
      locale: ctx.locale,
    });
  });
