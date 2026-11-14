import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  clearPayment,
  requirePayer,
  requireTrackedGame,
} from "#src/game-payments/payers";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A player takes back their claim. Only an unconfirmed claim can be undone. */
export async function unclaimPayment(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireTrackedGame(database, args.gameId, locale);
  const payer = await requirePayer(database, game, args.userId, locale);
  if (payer.record?.status !== "claimed") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        payer.record?.status === "paid"
          ? messagesFor(locale).gamePayments.errors.alreadyPaid
          : messagesFor(locale).gamePayments.errors.notClaimed,
    });
  }
  await clearPayment(database, { gameId: game.id, userId: args.userId });
  return { status: null };
}

export const unclaimProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return unclaimPayment(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
