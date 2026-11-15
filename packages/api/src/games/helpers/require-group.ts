import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { groups } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireGroup(
  database: DbClient,
  groupId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });
  if (!group) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).group.errors.notFound,
    });
  }
  return group;
}
