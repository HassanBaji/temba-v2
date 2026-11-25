import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  GAME_GENDER_TAGS,
  type GameGenderTag,
} from "@repo/domain/game-gender-tag";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

/** The Gender tag is a label, so changing it moves no seat and asks nobody to leave. */
export async function updateGameGenderTag(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    genderTag: GameGenderTag | null;
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
  await database
    .update(games)
    .set({ genderTag: args.genderTag, updatedAt: new Date() })
    .where(eq(games.id, game.id));
  return { ok: true as const };
}

export const updateGenderTag = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      genderTag: z.enum(GAME_GENDER_TAGS).nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateGameGenderTag(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      genderTag: input.genderTag,
      locale: ctx.locale,
    });
  });
