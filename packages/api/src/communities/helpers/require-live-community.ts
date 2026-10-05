import { requireCommunity } from "#src/communities/helpers/require-community";
import { consult, refuseIfFrozen } from "#src/soft-archive";
import { type db } from "#src/db";

type DbClient = typeof db;

export async function requireLiveCommunity(database: DbClient, id: string) {
  const community = await requireCommunity(database, id);
  refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "host", {
    frozenMessage: "Cannot manage invites for an archived Community",
  });
  return community;
}
