import { and, eq, isNull } from "drizzle-orm";

import { notifications } from "@repo/db";

import { type db } from "#src/db";
import { removeJob } from "#src/jobs/enqueue";
import { notificationEmailJob } from "#src/jobs/specs";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * One `mark_received` Notification per giver, receiver and Match: the key is
 * unique per recipient, so giving again after a retract tells nobody twice.
 */
export function markReceivedDedupeKey(matchId: string, giverUserId: string) {
  return `mark_received:${matchId}:${giverUserId}`;
}

/**
 * A retracted Mark takes back its Notification while nobody has seen it: not
 * read and not emailed, together with its pending email. Once seen it stays,
 * and the key above keeps a later give from sending another.
 */
export async function withdrawUnseenMarkReceived(
  database: DbClient,
  args: { matchId: string; giverUserId: string; receiverUserId: string },
) {
  const removed = await database
    .delete(notifications)
    .where(
      and(
        eq(notifications.recipientUserId, args.receiverUserId),
        eq(
          notifications.dedupeKey,
          markReceivedDedupeKey(args.matchId, args.giverUserId),
        ),
        isNull(notifications.readAt),
        isNull(notifications.emailedAt),
      ),
    )
    .returning({ id: notifications.id });
  for (const { id } of removed) {
    await removeJob(database, notificationEmailJob(id).key);
  }
}
