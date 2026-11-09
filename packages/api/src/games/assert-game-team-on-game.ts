import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { gameTeams } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function assertGameTeamOnGame(
  database: DbClient,
  gameId: string,
  gameTeamId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const row = await database.query.gameTeams.findFirst({
    where: and(eq(gameTeams.id, gameTeamId), eq(gameTeams.gameId, gameId)),
    columns: { id: true },
  });
  if (!row) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.gameTeamNotOnGame,
    });
  }
}
