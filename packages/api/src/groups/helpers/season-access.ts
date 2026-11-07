import type { groups } from "@repo/db";
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
) {
  if (canManageSeasons(group, userId)) {
    return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Only the Group owner can manage seasons",
  });
}
