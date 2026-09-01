import { requireGame } from "~/server/games/access";
import { leaveRegisteredSeat } from "~/server/games/waitlist";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function leaveGame(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  await database.transaction(async (tx) => {
    await leaveRegisteredSeat(tx, game, args.userId);
  });
  return { ok: true as const };
}
