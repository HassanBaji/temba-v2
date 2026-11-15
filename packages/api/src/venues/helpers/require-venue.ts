import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { venues } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireVenue(
  database: DbClient,
  id: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, id),
    columns: { id: true, archivedAt: true },
  });

  if (!venue) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).venue.errors.notFound,
    });
  }

  return venue;
}
