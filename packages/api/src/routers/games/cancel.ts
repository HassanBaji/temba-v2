import { z } from "zod";

import { type Locale, DEFAULT_LOCALE } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  assertGameCancellable,
  cancelGameRecord,
} from "#src/games/helpers/cancel-game-record";

export async function cancelGame(
  database: typeof db,
  args: { gameId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  await database.transaction(async (tx) => {
    await assertGameCancellable(tx, game, args.locale);
    await cancelGameRecord(tx, game, locale);
  });
  return { ok: true as const };
}

export const cancel = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return cancelGame(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
