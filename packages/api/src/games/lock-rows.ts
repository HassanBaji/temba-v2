import type { DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { games, matches } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

/** The Match row, locked for the rest of the transaction. */
export async function lockMatch(
  tx: DbTx,
  matchId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const [locked] = await tx
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .for("update");
  if (!locked) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.matchNotFound,
    });
  }
  return locked;
}

/** The Game row, locked for the rest of the transaction. */
export async function lockGame(
  tx: DbTx,
  gameId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const [locked] = await tx
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .for("update");
  if (!locked) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  return locked;
}
