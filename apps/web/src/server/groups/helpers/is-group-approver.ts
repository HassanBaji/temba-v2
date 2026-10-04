import type { DbClient, DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";

import { communities, type groups } from "@repo/db";
import { eq } from "drizzle-orm";

import { isStaffRole } from "~/server/games/access";
import { requireCommunityMembership } from "~/server/groups/helpers/require-community-membership";
import { consult } from "~/server/soft-archive";

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
