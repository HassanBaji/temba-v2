import { requireGroup } from "~/server/groups/helpers/require-group";
import { requireLiveClubCommunity } from "~/server/groups/helpers/require-live-club-community";
import { requireLooseCreator } from "~/server/groups/helpers/require-loose-creator";
import { requireStaff } from "~/server/groups/helpers/require-staff";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function requireGroupInviteLinkMinter(
  database: DbClient,
  groupId: string,
  callerId: string,
) {
  const group = await requireGroup(database, groupId);

  if (!group.communityId) {
    return requireLooseCreator(database, groupId, callerId);
  }

  await requireLiveClubCommunity(database, group.communityId);
  await requireStaff(
    database,
    group.communityId,
    callerId,
    "Only Owner or Admin can mint a Club Group Invite link",
  );

  return group;
}
