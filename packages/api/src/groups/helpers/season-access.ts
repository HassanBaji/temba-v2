import type { DbClient, DbTx, groups } from "@repo/db";
import { TRPCError } from "@trpc/server";

import { isGroupOwnerOrStaff } from "#src/groups/helpers/group-owner";

type DbOrTx = DbClient | DbTx;

/**
 * Seasons are a Group setting (design "Seasons" 1j): whoever may edit the
 * Group may open and close them — the creator who owns it, or Owner and
 * Admin on a Club Group.
 */
export async function canManageSeasons(
  database: DbOrTx,
  group: Pick<typeof groups.$inferSelect, "id" | "communityId" | "createdBy">,
  userId: string,
) {
  return isGroupOwnerOrStaff(database, group, userId);
}

export async function assertCanManageSeasons(
  database: DbOrTx,
  group: Pick<typeof groups.$inferSelect, "id" | "communityId" | "createdBy">,
  userId: string,
) {
  if (await canManageSeasons(database, group, userId)) {
    return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Only the Group owner can manage seasons",
  });
}
