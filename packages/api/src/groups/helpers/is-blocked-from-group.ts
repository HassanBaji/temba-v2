import type { DbClient, DbTx } from "@repo/db";
import { and, eq } from "drizzle-orm";

import { groupJoinRequests, GroupJoinRequestStatusEnum } from "@repo/db";

type DbOrTx = DbClient | DbTx;

export async function isBlockedFromGroup(
  database: DbOrTx,
  groupId: string,
  userId: string,
) {
  const blocked = await database.query.groupJoinRequests.findFirst({
    where: and(
      eq(groupJoinRequests.groupId, groupId),
      eq(groupJoinRequests.userId, userId),
      eq(groupJoinRequests.status, GroupJoinRequestStatusEnum.BLOCKED),
    ),
    columns: { id: true },
  });
  return Boolean(blocked);
}
