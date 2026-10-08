import type { DbClient, DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";

import { communities, communityMembers, type groups } from "@repo/db";
import { eq } from "drizzle-orm";

import { isStaffRole } from "#src/games/access";
import { requireCommunityMembership } from "#src/groups/helpers/require-community-membership";
import { consult } from "#src/soft-archive";

type DbOrTx = DbClient | DbTx;

export async function isGroupApprover(
  database: DbOrTx,
  group: typeof groups.$inferSelect,
  userId: string,
) {
  if (group.communityId) {
    const community = await database.query.communities.findFirst({
      where: eq(communities.id, group.communityId),
      columns: { archivedAt: true },
    });
    if (!community) {
      return false;
    }
    if (consult({ archivedAt: community.archivedAt }).freeze("host")) {
      return false;
    }
    const membership = await requireCommunityMembership(
      database,
      group.communityId,
      userId,
    );
    if (isStaffRole(membership?.role)) {
      return true;
    }
    return group.createdBy === userId && membership != null;
  }

  return group.createdBy === userId;
}

export async function groupApproverUserIds(
  database: DbOrTx,
  group: Pick<typeof groups.$inferSelect, "communityId" | "createdBy">,
): Promise<string[]> {
  if (!group.communityId) {
    return [group.createdBy];
  }
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, group.communityId),
    columns: { archivedAt: true },
  });
  if (
    !community ||
    consult({ archivedAt: community.archivedAt }).freeze("host")
  ) {
    return [];
  }
  const members = await database.query.communityMembers.findMany({
    where: eq(communityMembers.communityId, group.communityId),
    columns: { userId: true, role: true },
  });
  const approvers = new Set<string>();
  for (const member of members) {
    if (isStaffRole(member.role) || member.userId === group.createdBy) {
      approvers.add(member.userId);
    }
  }
  return [...approvers];
}

export async function assertGroupApprover(
  database: DbOrTx,
  group: typeof groups.$inferSelect,
  userId: string,
) {
  if (await isGroupApprover(database, group, userId)) {
    return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Only a Group approver can do that",
  });
}
