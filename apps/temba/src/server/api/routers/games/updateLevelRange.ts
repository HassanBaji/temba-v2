import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "~/server/games/access";
import {
  LEVEL_RANGE_INVERTED_MESSAGE,
  LEVEL_TENTHS_MAX,
  LEVEL_TENTHS_MIN,
} from "~/lib/level-range";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function updateGameLevelRangeOnGame(
  database: Tx,
  game: GameRow,
  levelMinTenths: number | null,
  levelMaxTenths: number | null,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a cancelled Game",
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
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  await database.transaction(async (tx) => {
    await updateGameLevelRangeOnGame(
      tx,
      game,
      args.levelMinTenths,
      args.levelMaxTenths,
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
            message: LEVEL_RANGE_INVERTED_MESSAGE,
            path: ["levelMinTenths"],
          });
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: LEVEL_RANGE_INVERTED_MESSAGE,
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
    });
  });
