import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { commit, throwCommitFailure } from "~/server/soft-archive";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function softArchive(
  database: DbClient,
  args: { communityId: string; userId: string },
) {
  const community = await requireCommunity(database, args.communityId);

  await requireStaff(database, community.id, args.userId);

  // Soft-archive hides listing and join paths. Club Groups stay attached
  // (communityId unchanged). Invite tokens are kept, not auto-revoked.
  const updated = await commit(
    database,
    { communityId: community.id },
    "archived",
  );
  if (!updated.ok) {
    throwCommitFailure(updated);
  }

  return {
    id: updated.id,
    archivedAt: updated.archivedAt,
  };
}
