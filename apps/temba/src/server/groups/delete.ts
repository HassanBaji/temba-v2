import { deleteEmptyGroup } from "~/server/groups/helpers/delete-empty-group";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function deleteGroup(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  return deleteEmptyGroup({
    database,
    groupId: args.groupId,
    callerId: args.userId,
  });
}
