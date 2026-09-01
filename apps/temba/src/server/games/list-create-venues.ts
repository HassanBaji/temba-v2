import { type db } from "~/server/db";
import { assertMayCreateGameOnGroup } from "~/server/games/access";
import { requireGroup } from "~/server/games/helpers/require-group";
import { listVenuesForGameCreate } from "~/server/games/list-venues-for-game-create";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function listCreateVenues(
  database: DbClient,
  args: { userId: string; groupId?: string },
) {
  if (args.groupId) {
    const group = await requireGroup(database, args.groupId);
    await assertMayCreateGameOnGroup(database, group, args.userId);
  }
  return listVenuesForGameCreate(database, args.groupId);
}
