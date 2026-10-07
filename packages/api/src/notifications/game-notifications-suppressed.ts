import type { DbClient, DbTx } from "@repo/db";

import type { GameRow } from "#src/games/access";
import { consult } from "#src/soft-archive";

type DbOrTx = DbClient | DbTx;

/** A Soft-archived Community produces no Game Notifications, for admins and players alike. */
export async function gameNotificationsSuppressed(
  database: DbOrTx,
  game: Pick<GameRow, "groupId">,
): Promise<boolean> {
  const view = await consult(database, {
    clubGroupGame: { groupId: game.groupId },
  });
  return view.ok && view.freeze("host");
}
