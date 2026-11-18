import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games } from "@repo/db";

import { isMatchMinutes } from "@repo/domain/match-minutes";
import { isKingOfTheCourt } from "@repo/domain/tournament-king";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameNotFrozen,
  assertGameOrganizer,
  requireGame,
} from "#src/games/access";

/**
 * A Social's match length, until the draw is posted: the draw times its
 * Rounds from it. King of the court plays no timed Matches, so it has none.
 */
export async function updateGameMatchMinutes(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    matchMinutes: number;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const messages = messagesFor(locale);
  const m = messages.game.errors;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  if (game.format !== "friendly_tournament") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.matchMinutesTournamentOnly,
    });
  }
  if (isKingOfTheCourt(game.format, game.tournamentShape)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.matchMinutesKing });
  }
  await assertGameNotFrozen(database, game, args.now ?? new Date(), locale);
  if (game.drawPostedAt != null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.matchMinutesAfterDraw,
    });
  }
  if (!isMatchMinutes(args.matchMinutes)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messages.createGame.matchMinutes,
    });
  }
  await database
    .update(games)
    .set({ matchMinutes: args.matchMinutes, updatedAt: new Date() })
    .where(eq(games.id, game.id));
  return { ok: true as const };
}

export const updateMatchMinutes = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchMinutes: z.number().int(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateGameMatchMinutes(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      matchMinutes: input.matchMinutes,
      locale: ctx.locale,
    });
  });
