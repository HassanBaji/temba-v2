import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { games } from "@repo/db";

import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "~/server/games/access";
import { type db } from "~/server/db";

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
