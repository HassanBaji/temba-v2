import type { DbClient, DbTx } from "@repo/db";
import { and, inArray, lt } from "drizzle-orm";

import {
  notifications,
  user,
  type NotificationAudience,
  type NotificationType,
} from "@repo/db";

import type { MarkKind } from "@repo/domain/marks";

import { enqueue } from "#src/jobs/enqueue";
import { notificationEmailJob } from "#src/jobs/specs";
import { notificationRetentionCutoff } from "#src/notifications/retention";
import { unclaimedUserSql } from "#src/unclaimed-players/is-unclaimed";

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
  challengeId?: string | null;
  groupTierEventId?: string | null;
  matchDisputeId?: string | null;
  viaWaitlist?: boolean;
  gameCount?: number | null;
  markKind?: MarkKind | null;
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

async function dropUnclaimedRecipients(
  database: DbOrTx,
  audiences: Map<string, NotificationAudience>,
) {
  if (audiences.size === 0) {
    return;
  }
  const unclaimed = await database
    .select({ id: user.id })
    .from(user)
    .where(and(inArray(user.id, [...audiences.keys()]), unclaimedUserSql));
  for (const { id } of unclaimed) {
    audiences.delete(id);
  }
}

/**
 * The only writer of `notifications` rows; call it inside the event's
 * transaction. Each inserted row also gets its Notification email Job there,
 * so an email exists only if the event commits (ADR-0054).
 */
export async function notify(
  database: DbOrTx,
  args: NotifyArgs,
): Promise<void> {
  const audiences = audienceByRecipient(args.recipients, args.excludeUserIds);
  await dropUnclaimedRecipients(database, audiences);
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
    challengeId: args.challengeId ?? null,
    groupTierEventId: args.groupTierEventId ?? null,
    matchDisputeId: args.matchDisputeId ?? null,
    viaWaitlist: args.viaWaitlist ?? false,
    gameCount: args.gameCount ?? null,
    markKind: args.markKind ?? null,
    dedupeKey: args.dedupeKey ?? null,
  }));

  const insert = database.insert(notifications).values(rows).returning();
  const inserted = await (args.dedupeKey
    ? insert.onConflictDoNothing()
    : insert);
  for (const { id } of inserted) {
    await enqueue(database, notificationEmailJob(id));
  }

  await database
    .delete(notifications)
    .where(
      and(
        inArray(notifications.recipientUserId, [...audiences.keys()]),
        lt(notifications.createdAt, notificationRetentionCutoff(new Date())),
      ),
    );
}
