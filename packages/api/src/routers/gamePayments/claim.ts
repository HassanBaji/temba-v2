import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { gameAdminUserIds } from "#src/games/access";
import {
  lockTrackedGame,
  requirePayer,
  writePayment,
} from "#src/game-payments/ledger";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A player says they have paid the Organizer. It stays a claim until the
 * Organizer or a Group admin confirms it; a sent-back claim can be made
 * again. The Game admins hear of each new claim once: taking it back and
 * claiming again does not tell them twice.
 */
export async function claimPayment(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale; now?: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  await database.transaction(async (tx) => {
    const game = await lockTrackedGame(tx, args.gameId, locale);
    const payer = await requirePayer(tx, game, args.userId, { now, locale });
    if (payer.record?.status === "paid") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).gamePayments.errors.alreadyPaid,
      });
    }
    if (payer.record?.status === "claimed") {
      return;
    }
    await writePayment(tx, {
      gameId: game.id,
      userId: args.userId,
      actorUserId: args.userId,
      action: "claimed",
      status: "claimed",
      now,
      fields: { claimedAt: now },
    });
    const sentBackAt = payer.record?.returnedAt?.getTime() ?? 0;
    await notify(tx, {
      type: "game_payment_claimed",
      recipients: (await gameAdminUserIds(tx, game)).map((userId) => ({
        userId,
        audience: "admin" as const,
      })),
      excludeUserIds: [args.userId],
      actorUserId: args.userId,
      gameId: game.id,
      groupId: game.groupId,
      dedupeKey: `game_payment_claimed:${game.id}:${args.userId}:${sentBackAt}`,
    });
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
