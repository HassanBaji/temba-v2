import { requireGroupLookupSender } from "~/server/groups/helpers/require-group-lookup-sender";
import { listLookup } from "~/server/invites/doors";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function listLookupInvites(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  const { group } = await requireGroupLookupSender(
    database,
    args.groupId,
    args.userId,
  );

  return listLookup(database, { kind: "group", id: group.id });
}
