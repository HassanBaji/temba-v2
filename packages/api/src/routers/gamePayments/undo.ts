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
  lockTrackedGame,
  requirePayer,
} from "#src/game-payments/ledger";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The Organizer or a Group admin takes a confirmed payment back to not paid,
 * including one kept by a player who has since come to play free.
 */
export async function undoPayment(
  database: DbClient,
  args: {
    gameId: string;
    actorUserId: string;
    playerUserId: string;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  await database.transaction(async (tx) => {
    const game = await lockTrackedGame(tx, args.gameId, locale);
    await assertGameOrganizer(tx, game, args.actorUserId, locale);
    const payer = await requirePayer(tx, game, args.playerUserId, {
      now,
      locale,
      allowFree: true,
    });
    if (payer.record?.status !== "paid") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).gamePayments.errors.notPaid,
      });
    }
    await clearPayment(tx, {
      gameId: game.id,
      userId: args.playerUserId,
      actorUserId: args.actorUserId,
      action: "undone",
      now,
    });
  });
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
