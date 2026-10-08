import type { DbClient, DbTx, groups } from "@repo/db";

import { NotificationAudienceEnum, NotificationTypeEnum } from "@repo/db";

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
  const approvers = await groupApproverUserIds(database, args.group);
  await notify(database, {
    type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
    recipients: approvers.map((userId) => ({
      userId,
      audience: NotificationAudienceEnum.ADMIN,
    })),
    excludeUserIds: [args.joinerUserId, args.decidedByUserId].filter(
      (id): id is string => id != null,
    ),
    actorUserId: args.joinerUserId,
    groupId: args.group.id,
  });
}
