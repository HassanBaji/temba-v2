import { TRPCError } from "@trpc/server";

import { type GameRow } from "~/server/games/access";
import { writeGameCancelled } from "~/server/games/helpers/write-game-cancelled";
import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function cancelGameRecord(database: Tx, game: GameRow) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game is already cancelled",
    });
  }
  await writeGameCancelled(database, game);
}
