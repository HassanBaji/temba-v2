import { requireGroupInviter } from "#src/groups/helpers/require-group-inviter";
import { type db } from "#src/db";

type DbClient = typeof db;

export async function requireGroupLookupSender(
  database: DbClient,
  groupId: string,
  callerId: string,
) {
  return requireGroupInviter(database, groupId, callerId);
}
