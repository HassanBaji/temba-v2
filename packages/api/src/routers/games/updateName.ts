import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  GAME_CUSTOM_NAME_MAX_LENGTH,
  gameWindowLabel,
  normalizeGameCustomName,
} from "@repo/domain/game-custom-name";
import { messagesFor } from "@repo/i18n/messages";

export async function updateGameName(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    customName: string | null;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.editCancelled,
    });
  }
  if (game.format !== "friendly_game") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.customNameFriendly,
    });
  }

  const customName = normalizeGameCustomName(args.customName);
  await database
    .update(games)
    .set({
      name:
        customName ??
        gameWindowLabel(
          game.windowStart,
          game.windowEnd,
          args.locale ?? DEFAULT_LOCALE,
        ),
      hasCustomName: customName != null,
      updatedAt: new Date(),
    })
    .where(eq(games.id, game.id));
  return { ok: true as const };
}

export const updateName = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      customName: z.string().trim().max(GAME_CUSTOM_NAME_MAX_LENGTH).nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateGameName(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      customName: input.customName,
      locale: ctx.locale,
    });
  });
