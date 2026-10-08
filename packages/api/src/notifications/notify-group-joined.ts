import type { DbClient, DbTx, groups } from "@repo/db";

import { groupApproverUserIds } from "#src/groups/helpers/is-group-approver";
import { notify } from "#src/notifications/notify";

type DbOrTx = DbClient | DbTx;

export async function notifyGroupJoined(
  database: DbOrTx,
  args: {
    group: Pick<typeof groups.$inferSelect, "id" | "communityId" | "createdBy">;
    joinerUserId: string;
    decidedByUserId?: string;
  },
) {
  const approverIds = await groupApproverUserIds(database, args.group);
  return notify(database, {
    type: "group_member_joined",
    recipients: approverIds.map((userId) => ({ userId, audience: "admin" })),
    excludeUserIds: args.decidedByUserId
      ? [args.joinerUserId, args.decidedByUserId]
      : [args.joinerUserId],
    actorUserId: args.joinerUserId,
    groupId: args.group.id,
  });
}
