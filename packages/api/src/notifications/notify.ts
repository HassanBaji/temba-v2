import type { DbClient, DbTx } from "@repo/db";
import { and, inArray, lt } from "drizzle-orm";

import {
  notifications,
  type NotificationAudience,
  type NotificationType,
} from "@repo/db";

import { notificationRetentionCutoff } from "#src/notifications/retention";

type DbOrTx = DbClient | DbTx;

export type NotificationRecipient = {
  userId: string;
  audience: NotificationAudience;
};

export type NotifyArgs = {
  type: NotificationType;
  recipients: NotificationRecipient[];
  excludeUserIds: string[];
  actorUserId?: string | null;
  partnerUserId?: string | null;
  teamId?: string | null;
  groupId?: string | null;
  gameId?: string | null;
  levelOverrideId?: string | null;
  viaWaitlist?: boolean;
  dedupeKey?: string | null;
};

function audienceByRecipient(
  recipients: NotificationRecipient[],
  excludeUserIds: string[],
) {
  const excluded = new Set(excludeUserIds);
  const audiences = new Map<string, NotificationAudience>();
  for (const { userId, audience } of recipients) {
    if (excluded.has(userId) || audiences.get(userId) === "admin") {
      continue;
    }
    audiences.set(userId, audience);
  }
  return audiences;
}

/** The only writer of `notifications` rows; call it inside the event's transaction. */
export async function notify(
  database: DbOrTx,
  args: NotifyArgs,
): Promise<void> {
  const audiences = audienceByRecipient(args.recipients, args.excludeUserIds);
  if (audiences.size === 0) {
    return;
  }

  const rows = [...audiences].map(([recipientUserId, audience]) => ({
    recipientUserId,
    audience,
    type: args.type,
    actorUserId: args.actorUserId ?? null,
    partnerUserId: args.partnerUserId ?? null,
    teamId: args.teamId ?? null,
    groupId: args.groupId ?? null,
    gameId: args.gameId ?? null,
    levelOverrideId: args.levelOverrideId ?? null,
    viaWaitlist: args.viaWaitlist ?? false,
    dedupeKey: args.dedupeKey ?? null,
  }));

  const insert = database.insert(notifications).values(rows);
  await (args.dedupeKey ? insert.onConflictDoNothing() : insert);

  await database
    .delete(notifications)
    .where(
      and(
        inArray(notifications.recipientUserId, [...audiences.keys()]),
        lt(notifications.createdAt, notificationRetentionCutoff(new Date())),
      ),
    );
}
