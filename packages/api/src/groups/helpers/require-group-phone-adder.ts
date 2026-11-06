import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";
import { type db } from "#src/db";

type DbClient = typeof db;

/** A Group approver adding players by phone. */
export async function requireGroupPhoneAdder(
  database: DbClient,
  groupId: string,
  callerId: string,
) {
  const group = await requireGroup(database, groupId);
  await assertGroupApprover(database, group, callerId);
  return group;
}
