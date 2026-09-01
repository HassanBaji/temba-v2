import { requireLiveCommunity } from "~/server/communities/helpers/require-live-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { listLookup } from "~/server/invites/doors";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function listLookupInvites(
  database: DbClient,
  args: { communityId: string; userId: string },
) {
  const community = await requireLiveCommunity(database, args.communityId);
  await requireStaff(database, community.id, args.userId);

  return listLookup(database, {
    kind: "community",
    id: community.id,
  });
}
