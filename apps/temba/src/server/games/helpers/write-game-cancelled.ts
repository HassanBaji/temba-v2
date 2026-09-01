import { eq } from "drizzle-orm";

import { MatchStatusEnum, gameWaitlist, games, matches } from "@repo/db";

import { type GameRow } from "~/server/games/access";
import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function writeGameCancelled(database: Tx, game: GameRow) {
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
