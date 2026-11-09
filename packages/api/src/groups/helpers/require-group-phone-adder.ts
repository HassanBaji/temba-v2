import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";
import { type db } from "#src/db";

type DbClient = typeof db;

/** A Group approver adding players by phone. */
export async function requireGroupPhoneAdder(
  database: DbClient,
  groupId: string,
  callerId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const group = await requireGroup(database, groupId, locale);
  await assertGroupApprover(database, group, callerId, locale);
  return group;
}
