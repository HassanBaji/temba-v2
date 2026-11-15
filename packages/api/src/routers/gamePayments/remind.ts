import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer } from "#src/games/access";
import {
  loadPayers,
  lockTrackedGame,
  paymentReminderAudience,
  paymentReminderDedupeKey,
} from "#src/game-payments/ledger";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The Organizer or a Group admin reminds everyone still not paid. A player
 * hears it at most once a day per Game, and the count returned is who this
 * press reached.
 */
export async function remindPayments(
  database: DbClient,
  args: { gameId: string; actorUserId: string; locale?: Locale; now?: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  return database.transaction(async (tx) => {
    const game = await lockTrackedGame(tx, args.gameId, locale);
    await assertGameOrganizer(tx, game, args.actorUserId, locale);
    const { payers } = await loadPayers(tx, game, now);
    const { toRemind } = await paymentReminderAudience(tx, {
      gameId: game.id,
      payers,
      senderUserId: args.actorUserId,
      now,
    });
    await notify(tx, {
      type: "game_payment_reminder",
      recipients: toRemind.map((payer) => ({
        userId: payer.userId,
        audience: "player" as const,
      })),
      excludeUserIds: [args.actorUserId],
      actorUserId: args.actorUserId,
      gameId: game.id,
      groupId: game.groupId,
      dedupeKey: paymentReminderDedupeKey(game.id, now),
    });
    return { reminded: toRemind.length };
  });
}

export const remindProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return remindPayments(ctx.db, {
      gameId: input.gameId,
      actorUserId: appUser.id,
      locale: ctx.locale,
    });
  });
