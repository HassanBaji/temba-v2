import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  requireNotChallengeGame,
  type GameRow,
} from "#src/games/access";
import {
  levelRangeInvertedMessage,
  LEVEL_TENTHS_MAX,
  LEVEL_TENTHS_MIN,
} from "@repo/domain/level-range";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function updateGameLevelRangeOnGame(
  database: Tx,
  game: GameRow,
  levelMinTenths: number | null,
  levelMaxTenths: number | null,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.editCancelled,
    });
  }

  if (
    game.sport === "football" &&
    !game.rated &&
    (levelMinTenths != null || levelMaxTenths != null)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).football.errors.noLevelRange,
    });
  }

  const now = new Date();
  await database
    .update(games)
    .set({ levelMinTenths, levelMaxTenths, updatedAt: now })
    .where(eq(games.id, game.id));
}

export async function updateGameLevelRange(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    levelMinTenths: number | null;
    levelMaxTenths: number | null;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, args.locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  await database.transaction(async (tx) => {
    await updateGameLevelRangeOnGame(
      tx,
      game,
      args.levelMinTenths,
      args.levelMaxTenths,
      locale,
    );
  });
  return { ok: true as const };
}

export const updateLevelRange = protectedProcedure
  .input(
    z
      .object({
        gameId: z.string().uuid(),
        levelMinTenths: z
          .number()
          .int()
          .min(LEVEL_TENTHS_MIN)
          .max(LEVEL_TENTHS_MAX)
          .nullable(),
        levelMaxTenths: z
          .number()
          .int()
          .min(LEVEL_TENTHS_MIN)
          .max(LEVEL_TENTHS_MAX)
          .nullable(),
      })
      .superRefine((value, ctx) => {
        if (
          value.levelMinTenths != null &&
          value.levelMaxTenths != null &&
          value.levelMinTenths > value.levelMaxTenths
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: levelRangeInvertedMessage(DEFAULT_LOCALE),
            path: ["levelMinTenths"],
          });
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: levelRangeInvertedMessage(DEFAULT_LOCALE),
            path: ["levelMaxTenths"],
          });
        }
      }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateGameLevelRange(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      levelMinTenths: input.levelMinTenths,
      levelMaxTenths: input.levelMaxTenths,
      locale: ctx.locale,
    });
  });
