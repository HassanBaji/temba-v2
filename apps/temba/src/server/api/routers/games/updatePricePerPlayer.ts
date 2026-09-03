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
import { PRICE_PER_PLAYER_MAX_CENTS } from "~/lib/price-per-player";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function updateGamePricePerPlayerOnGame(
  database: Tx,
  game: GameRow,
  pricePerPlayerCents: number | null,
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
    .set({ pricePerPlayerCents, updatedAt: now })
    .where(eq(games.id, game.id));
}

export async function updateGamePricePerPlayer(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    pricePerPlayerCents: number | null;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  await database.transaction(async (tx) => {
    await updateGamePricePerPlayerOnGame(tx, game, args.pricePerPlayerCents);
  });
  return { ok: true as const };
}

export const updatePricePerPlayer = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      pricePerPlayerCents: z
        .number()
        .int()
        .min(0)
        .max(PRICE_PER_PLAYER_MAX_CENTS)
        .nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateGamePricePerPlayer(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      pricePerPlayerCents: input.pricePerPlayerCents,
    });
  });
