import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { requireGroupInviter } from "#src/groups/helpers/require-group-inviter";
import { type db } from "#src/db";

type DbClient = typeof db;

export async function requireGroupLookupSender(
  database: DbClient,
  groupId: string,
  callerId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  return requireGroupInviter(database, groupId, callerId, locale);
}
