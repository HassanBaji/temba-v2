import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { MatchStatusEnum, gameWaitlist, games, matches } from "@repo/db";

import { type GameRow } from "~/server/games/access";
import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function cancelGameRecord(database: Tx, game: GameRow) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game is already cancelled",
    });
  }
  const now = new Date();
  await database
    .update(games)
    .set({ cancelledAt: now, updatedAt: now })
    .where(eq(games.id, game.id));
  await database.delete(gameWaitlist).where(eq(gameWaitlist.gameId, game.id));
  await database
    .update(matches)
    .set({ status: MatchStatusEnum.CANCELLED, updatedAt: now })
    .where(eq(matches.gameId, game.id));
}
