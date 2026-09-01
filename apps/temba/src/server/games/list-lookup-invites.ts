import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { listLookup } from "~/server/invites/doors";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function listLookupInvites(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  return listLookup(database, { kind: "game", id: game.id });
}
