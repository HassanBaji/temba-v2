import type { DbClient, DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";

import type { groups } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import {
  appointedOrganizerUserIds,
  isAppointedOrganizer,
} from "#src/groups/helpers/appointed-organizers";

type DbOrTx = DbClient | DbTx;

type GroupForApprover = Pick<typeof groups.$inferSelect, "id" | "createdBy">;

/** The Group creator or an Appointed Organizer (ADR-0047). */
export async function isGroupApprover(
  database: DbOrTx,
  group: GroupForApprover,
  userId: string,
) {
  if (group.createdBy === userId) {
    return true;
  }
  return isAppointedOrganizer(database, group, userId);
}

export async function groupApproverUserIds(
  database: DbOrTx,
  group: GroupForApprover,
): Promise<string[]> {
  return [
    ...new Set([
      group.createdBy,
      ...(await appointedOrganizerUserIds(database, group)),
    ]),
  ];
}

export async function assertGroupApprover(
  database: DbOrTx,
  group: GroupForApprover,
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (await isGroupApprover(database, group, userId)) {
    return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: messagesFor(locale).group.errors.approverOnly,
  });
}
