import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { groupSeries } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The Series with its Group. A deleted Group takes its Series' doors with it. */
export async function requireSeries(
  database: DbClient,
  id: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const series = await database.query.groupSeries.findFirst({
    where: eq(groupSeries.id, id),
    with: { group: true },
  });
  if (series?.group.deletedAt === null) {
    return series;
  }
  throw new TRPCError({
    code: "NOT_FOUND",
    message: messagesFor(locale).series.errors.notFound,
  });
}
