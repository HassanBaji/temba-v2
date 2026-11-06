import type { DbClient, DbTx } from "@repo/db";
import { and, eq } from "drizzle-orm";

import {
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  GroupTypeEnum,
  type groups,
} from "@repo/db";

import { isBlockedFromGroup } from "#src/groups/helpers/is-blocked-from-group";

type DbOrTx = DbClient | DbTx;

export type GroupJoinMode =
  | "member"
  | "join"
  | "request"
  | "requested"
  | "none";

export async function groupJoinMode(
  database: DbOrTx,
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

  if (await isBlockedFromGroup(database, group.id, userId)) {
    return "none";
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

  return group.requiresApproval ? "request" : "join";
}
