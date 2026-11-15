import { TRPCError } from "@trpc/server";

import type { groups } from "@repo/db";

type GroupForOwner = Pick<typeof groups.$inferSelect, "createdBy">;

/**
 * Who may edit, transfer or delete the Group: the creator who owns it.
 * Appointed Organizers run the Group; they do not own it.
 */
export function isGroupOwner(group: GroupForOwner, userId: string) {
  return group.createdBy === userId;
}

export function assertGroupOwner(
  group: GroupForOwner,
  userId: string,
  message: string,
) {
  if (isGroupOwner(group, userId)) {
    return;
  }
  throw new TRPCError({ code: "FORBIDDEN", message });
}
