import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { commit, throwCommitFailure } from "~/server/soft-archive";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function unarchive(
  database: DbClient,
  args: { communityId: string; userId: string },
) {
  const community = await requireCommunity(database, args.communityId);

  await requireStaff(database, community.id, args.userId);

  // Unarchive restores join rules. Live Invite link tokens stay valid
  // until each expires.
  const updated = await commit(database, { communityId: community.id }, "live");
  if (!updated.ok) {
    throwCommitFailure(updated);
  }

  return {
    id: updated.id,
    archivedAt: updated.archivedAt,
  };
}
