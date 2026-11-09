import type { DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { games, matches } from "@repo/db";

/** The Match row, locked for the rest of the transaction. */
export async function lockMatch(tx: DbTx, matchId: string) {
  const [locked] = await tx
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .for("update");
  if (!locked) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
  }
  return locked;
}

/** The Game row, locked for the rest of the transaction. */
export async function lockGame(tx: DbTx, gameId: string) {
  const [locked] = await tx
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .for("update");
  if (!locked) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
  }
  return locked;
}
