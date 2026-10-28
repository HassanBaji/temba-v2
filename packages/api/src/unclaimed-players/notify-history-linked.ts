import type { DbClient, DbTx } from "@repo/db";

import { notify } from "#src/notifications/notify";

export async function notifyHistoryLinked(
  database: DbClient | DbTx,
  args: { userId: string; gameCount: number; dedupeKey: string },
) {
  if (args.gameCount === 0) {
    return;
  }
  await notify(database, {
    type: "history_linked",
    recipients: [{ userId: args.userId, audience: "player" }],
    excludeUserIds: [],
    gameCount: args.gameCount,
    dedupeKey: args.dedupeKey,
  });
}
