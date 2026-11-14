import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { zonedParts } from "@repo/domain/product-timezone";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer } from "#src/games/access";
import { loadPayers, requireTrackedGame } from "#src/game-payments/payers";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The Organizer or a Group admin reminds everyone still not paid. A player
 * hears it at most once a day per Game, however often the button is pressed.
 */
export async function remindPayments(
  database: DbClient,
  args: { gameId: string; actorUserId: string; locale?: Locale; now?: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const game = await requireTrackedGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.actorUserId, locale);
  const due = (await loadPayers(database, game)).filter(
    (payer) => payer.mark === "due" && payer.userId !== args.actorUserId,
  );
  const day = zonedParts(now);
  await database.transaction(async (tx) => {
    await notify(tx, {
      type: "game_payment_reminder",
      recipients: due.map((payer) => ({
        userId: payer.userId,
        audience: "player" as const,
      })),
      excludeUserIds: [args.actorUserId],
      actorUserId: args.actorUserId,
      gameId: game.id,
      groupId: game.groupId,
      dedupeKey: `game_payment_reminder:${game.id}:${day.year}-${day.month}-${day.day}`,
    });
  });
  return { reminded: due.length };
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
