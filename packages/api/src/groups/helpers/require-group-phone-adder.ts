import { isStaffRole } from "#src/games/access";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireCommunityMembership } from "#src/groups/helpers/require-community-membership";
import { requireGroup } from "#src/groups/helpers/require-group";
import { consult, refuseIfFrozen } from "#src/soft-archive";
import { type db } from "#src/db";

type DbClient = typeof db;

/**
 * A Group approver adding players by phone. On a Club Group only Community
 * Owner or Admin may add someone who is not yet a Community Member, the same
 * auto-admit their Lookup invites carry.
 */
export async function requireGroupPhoneAdder(
  database: DbClient,
  groupId: string,
  callerId: string,
) {
  const group = await requireGroup(database, groupId);

  if (!group.communityId) {
    await assertGroupApprover(database, group, callerId);
    return { group, canAdmitCommunityMember: false as const };
  }

  refuseIfFrozen(
    await consult(database, { communityId: group.communityId }),
    "host",
    { frozenMessage: "Cannot add players to a Group in an archived Community" },
  );
  await assertGroupApprover(database, group, callerId);

  const callerMembership = await requireCommunityMembership(
    database,
    group.communityId,
    callerId,
  );
  return {
    group,
    canAdmitCommunityMember: isStaffRole(callerMembership?.role),
  };
}
