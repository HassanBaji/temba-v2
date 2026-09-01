import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { cancelGameRecord } from "~/server/games/helpers/cancel-game-record";
import { type db } from "~/server/db";

export async function cancelGame(
  database: typeof db,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  await database.transaction(async (tx) => {
    await cancelGameRecord(tx, game);
  });
  return { ok: true as const };
}
