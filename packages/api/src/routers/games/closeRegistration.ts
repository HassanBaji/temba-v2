import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games } from "@repo/db";
import { type Locale, DEFAULT_LOCALE } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  requireNotChallengeGame,
  type GameRow,
} from "#src/games/access";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function closeRegistrationOnGame(
  database: DbClient,
  game: GameRow,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.closeCancelled,
    });
  }
  if (game.registrationClosedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.registrationClosed,
    });
  }
  const now = new Date();
  await database
    .update(games)
    .set({ registrationClosedAt: now, updatedAt: now })
    .where(eq(games.id, game.id));
}

export async function closeRegistration(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, args.locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  await closeRegistrationOnGame(database, game, locale);
  return { ok: true as const };
}

export const closeRegistrationProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return closeRegistration(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
