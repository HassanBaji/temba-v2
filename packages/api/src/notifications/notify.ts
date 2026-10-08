import type { DbClient, DbTx } from "@repo/db";
import { and, inArray, lt } from "drizzle-orm";

import {
  NotificationAudienceEnum,
  type NotificationTypeEnum,
  notifications,
} from "@repo/db";

import { notificationRetentionCutoff } from "#src/notifications/retention";

type DbOrTx = DbClient | DbTx;

export type NotificationRecipient = {
  userId: string;
  audience: NotificationAudienceEnum;
};

export type NotifyArgs = {
  type: NotificationTypeEnum;
  recipients: NotificationRecipient[];
  excludeUserIds: string[];
  actorUserId?: string;
  partnerUserId?: string;
  teamId?: string;
  groupId?: string;
  gameId?: string;
  viaWaitlist?: boolean;
  dedupeKey?: string;
};

export async function notify(database: DbOrTx, args: NotifyArgs) {
  const excluded = new Set(args.excludeUserIds);
  const audienceByUser = new Map<string, NotificationAudienceEnum>();
  for (const { userId, audience } of args.recipients) {
    if (excluded.has(userId)) {
      continue;
    }
    if (audienceByUser.get(userId) !== NotificationAudienceEnum.ADMIN) {
      audienceByUser.set(userId, audience);
    }
  }
  if (audienceByUser.size === 0) {
    return;
  }

  const recipientIds = [...audienceByUser.keys()];
  await database
    .insert(notifications)
    .values(
      recipientIds.map((recipientUserId) => ({
        recipientUserId,
        type: args.type,
        audience: audienceByUser.get(recipientUserId),
        actorUserId: args.actorUserId,
        partnerUserId: args.partnerUserId,
        teamId: args.teamId,
        groupId: args.groupId,
        gameId: args.gameId,
        viaWaitlist: args.viaWaitlist ?? false,
        dedupeKey: args.dedupeKey,
      })),
    )
    .onConflictDoNothing();

  await database
    .delete(notifications)
    .where(
      and(
        inArray(notifications.recipientUserId, recipientIds),
        lt(notifications.createdAt, notificationRetentionCutoff()),
      ),
    );
}
