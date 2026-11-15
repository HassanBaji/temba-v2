import type { groups } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { TRPCError } from "@trpc/server";

import { isGroupOwner } from "#src/groups/helpers/group-owner";

/**
 * Seasons are a Group setting (design "Seasons" 1j): whoever may edit the
 * Group may open and close them — the creator who owns it.
 */
export function canManageSeasons(
  group: Pick<typeof groups.$inferSelect, "createdBy">,
  userId: string,
) {
  return isGroupOwner(group, userId);
}

export function assertCanManageSeasons(
  group: Pick<typeof groups.$inferSelect, "createdBy">,
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (canManageSeasons(group, userId)) {
    return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: messagesFor(locale).group.errors.seasonsOwnerOnly,
  });
}
