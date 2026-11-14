import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer } from "#src/games/access";
import {
  loadPayers,
  requireTrackedGame,
  writePayment,
} from "#src/game-payments/payers";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The Organizer or a Group admin confirms every open claim at once. */
export async function confirmAllPayments(
  database: DbClient,
  args: { gameId: string; actorUserId: string; locale?: Locale; now?: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const game = await requireTrackedGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.actorUserId, locale);
  const claimed = (await loadPayers(database, game)).filter(
    (payer) => payer.mark === "claimed",
  );
  await database.transaction(async (tx) => {
    for (const payer of claimed) {
      await writePayment(tx, {
        gameId: game.id,
        userId: payer.userId,
        actorUserId: args.actorUserId,
        status: "paid",
        now,
        fields: { paidAt: now, paidByUserId: args.actorUserId },
      });
    }
  });
  return { confirmed: claimed.length };
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
