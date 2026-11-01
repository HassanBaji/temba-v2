import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { communities, type groups } from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";

import { isStaffRole } from "#src/games/access";
import { requireCommunityMembership } from "#src/groups/helpers/require-community-membership";
import { consult } from "#src/soft-archive";

type DbOrTx = DbClient | DbTx;

type GroupForOwner = Pick<
  typeof groups.$inferSelect,
  "id" | "communityId" | "createdBy"
>;

/**
 * Who may edit, transfer or delete the Group: the creator who owns it and, on
 * a Club Group, Community Owner or Admin. The creator of a Club Group keeps
 * this only while a Community Member, and nobody has it while the Community is
 * Soft-archived. Appointed Organizers run the Group; they do not own it.
 */
export async function isGroupOwnerOrStaff(
  database: DbOrTx,
  group: GroupForOwner,
  userId: string,
) {
  if (!group.communityId) {
    return group.createdBy === userId;
  }
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, group.communityId),
    columns: { archivedAt: true },
  });
  if (
    !community ||
    consult({ archivedAt: community.archivedAt }).freeze("host")
  ) {
    return false;
  }
  const membership = await requireCommunityMembership(
    database,
    group.communityId,
    userId,
  );
  if (!membership) {
    return false;
  }
  return isStaffRole(membership.role) || group.createdBy === userId;
}

export async function assertGroupOwnerOrStaff(
  database: DbOrTx,
  group: GroupForOwner,
  userId: string,
  message = "Only the Group owner can do that",
) {
  if (await isGroupOwnerOrStaff(database, group, userId)) {
    return;
  }
  throw new TRPCError({ code: "FORBIDDEN", message });
}
