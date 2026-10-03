import { consult, refuseIfFrozen } from "~/server/soft-archive";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function refuseIfLinkedCommunityArchived(
  database: DbClient,
  team: { communityId: string | null },
  message: string,
) {
  if (!team.communityId) {
    return;
  }

  const view = await consult(database, { communityId: team.communityId });
  if (view.ok) {
    refuseIfFrozen(view, "host", { frozenMessage: message });
  }
}
