import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer } from "#src/games/access";
import {
  clearPayment,
  requirePayer,
  requireTrackedGame,
} from "#src/game-payments/payers";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The Organizer or a Group admin takes a confirmed payment back to not paid. */
export async function undoPayment(
  database: DbClient,
  args: {
    gameId: string;
    actorUserId: string;
    playerUserId: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireTrackedGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.actorUserId, locale);
  const payer = await requirePayer(database, game, args.playerUserId, locale);
  if (payer.record?.status !== "paid") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).gamePayments.errors.notPaid,
    });
  }
  await clearPayment(database, { gameId: game.id, userId: args.playerUserId });
  return { status: null };
}

export const undoProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid(), userId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return undoPayment(ctx.db, {
      gameId: input.gameId,
      actorUserId: appUser.id,
      playerUserId: input.userId,
      locale: ctx.locale,
    });
  });
