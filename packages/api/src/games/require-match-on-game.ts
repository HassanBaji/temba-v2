import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { matches } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireMatchOnGame(
  database: DbClient,
  gameId: string,
  matchId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const match = await database.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (match?.gameId !== gameId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.matchNotFound,
    });
  }
  return match;
}
