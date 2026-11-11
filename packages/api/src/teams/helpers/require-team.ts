import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { teams } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireTeam(
  database: DbClient,
  id: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const team = await database.query.teams.findFirst({
    where: eq(teams.id, id),
  });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).team.notFound.title,
    });
  }

  return team;
}
