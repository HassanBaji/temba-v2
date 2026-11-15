import { TRPCError } from "@trpc/server";

import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { isAppointedOrganizer } from "#src/groups/helpers/appointed-organizers";
import { requireGroup } from "#src/groups/helpers/require-group";
import { type db } from "#src/db";

type DbClient = typeof db;

/** Who manages a Group's invites: its creator and its Appointed Organizers. */
export async function requireGroupInviter(
  database: DbClient,
  groupId: string,
  callerId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const group = await requireGroup(database, groupId, locale);

  if (
    group.createdBy !== callerId &&
    !(await isAppointedOrganizer(database, group, callerId))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).group.errors.inviterOnly,
    });
  }

  return group;
}
