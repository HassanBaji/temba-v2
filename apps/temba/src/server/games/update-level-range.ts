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
