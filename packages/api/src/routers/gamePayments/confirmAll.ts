import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer } from "#src/games/access";
import {
  loadPayers,
  lockTrackedGame,
  writePayment,
} from "#src/game-payments/ledger";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The Organizer or a Group admin confirms every open claim at once. */
export async function confirmAllPayments(
  database: DbClient,
  args: { gameId: string; actorUserId: string; locale?: Locale; now?: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  return database.transaction(async (tx) => {
    const game = await lockTrackedGame(tx, args.gameId, locale);
    await assertGameOrganizer(tx, game, args.actorUserId, locale);
    const { payers } = await loadPayers(tx, game, now);
    const claimed = payers.filter((payer) => payer.mark === "claimed");
    for (const payer of claimed) {
      await writePayment(tx, {
        gameId: game.id,
        userId: payer.userId,
        actorUserId: args.actorUserId,
        action: "paid",
        status: "paid",
        now,
        fields: { paidAt: now, paidByUserId: args.actorUserId },
      });
    }
    return { confirmed: claimed.length };
  });
}

export const confirmAllProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return confirmAllPayments(ctx.db, {
      gameId: input.gameId,
      actorUserId: appUser.id,
      locale: ctx.locale,
    });
  });
