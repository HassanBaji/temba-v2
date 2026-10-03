import { and, eq } from "drizzle-orm";

import { groupJoinRequests, GroupJoinRequestStatusEnum } from "@repo/db";

import { type db } from "~/server/db";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0]
  | TestDatabase;

export async function markPendingGroupJoinRequestApproved(
  database: DbClient,
  args: { groupId: string; userId: string; decidedBy: string },
) {
  const existing = await database.query.groupJoinRequests.findFirst({
    where: and(
      eq(groupJoinRequests.groupId, args.groupId),
      eq(groupJoinRequests.userId, args.userId),
      eq(groupJoinRequests.status, GroupJoinRequestStatusEnum.PENDING),
    ),
    columns: { id: true },
  });
  if (!existing) {
    return;
  }

  await database
    .update(groupJoinRequests)
    .set({
      status: GroupJoinRequestStatusEnum.APPROVED,
      decidedBy: args.decidedBy,
      updatedAt: new Date(),
    })
    .where(eq(groupJoinRequests.id, existing.id));
}
