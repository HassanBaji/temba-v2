import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  requirePayer,
  requireTrackedGame,
  writePayment,
} from "#src/game-payments/payers";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A player says they have paid the Organizer. It stays a claim until the
 * Organizer or a Group admin confirms it; a sent-back claim can be made again.
 */
export async function claimPayment(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale; now?: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const game = await requireTrackedGame(database, args.gameId, locale);
  const payer = await requirePayer(database, game, args.userId, locale);
  if (payer.record?.status === "paid") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).gamePayments.errors.alreadyPaid,
    });
  }
  await writePayment(database, {
    gameId: game.id,
    userId: args.userId,
    actorUserId: args.userId,
    status: "claimed",
    now,
    fields: { claimedAt: now },
  });
  return { status: "claimed" as const };
}

export const claimProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return claimPayment(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
