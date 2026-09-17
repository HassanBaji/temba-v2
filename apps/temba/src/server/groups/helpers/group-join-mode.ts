import { and, eq } from "drizzle-orm";

import {
  communities,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  GroupTypeEnum,
  type groups,
} from "@repo/db";

import { type db } from "~/server/db";
import { requireCommunityMembership } from "~/server/groups/helpers/require-community-membership";
import { consult } from "~/server/soft-archive";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0]
  | TestDatabase;

export type GroupJoinMode =
  | "member"
  | "join"
  | "request"
  | "requested"
  | "none";

export async function groupJoinMode(
  database: DbClient,
  group: typeof groups.$inferSelect,
  userId: string,
): Promise<GroupJoinMode> {
  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, userId),
    ),
    columns: { id: true },
  });
  if (membership) {
    return "member";
  }

  if (group.communityId) {
    const community = await database.query.communities.findFirst({
      where: eq(communities.id, group.communityId),
      columns: { archivedAt: true },
    });
    if (
      !community ||
      consult({ archivedAt: community.archivedAt }).freeze("join")
    ) {
      return "none";
    }
  }

  if (group.type !== GroupTypeEnum.PUBLIC) {
    return "none";
  }

  const pending = await database.query.groupJoinRequests.findFirst({
    where: and(
      eq(groupJoinRequests.groupId, group.id),
      eq(groupJoinRequests.userId, userId),
      eq(groupJoinRequests.status, GroupJoinRequestStatusEnum.PENDING),
    ),
    columns: { id: true },
  });
  if (pending) {
    return "requested";
  }

  if (!group.communityId) {
    return group.requiresApproval ? "request" : "join";
  }

  const communityMembership = await requireCommunityMembership(
    database,
    group.communityId,
    userId,
  );
  if (!communityMembership) {
    return "request";
  }

  return group.requiresApproval ? "request" : "join";
}
