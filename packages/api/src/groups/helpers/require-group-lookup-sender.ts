import { TRPCError } from "@trpc/server";

import { isStaffRole } from "#src/games/access";
import { isAppointedOrganizer } from "#src/groups/helpers/appointed-organizers";
import { requireCommunityMembership } from "#src/groups/helpers/require-community-membership";
import { requireGroup } from "#src/groups/helpers/require-group";
import { requireLiveClubCommunity } from "#src/groups/helpers/require-live-club-community";
import { requireLooseInviter } from "#src/groups/helpers/require-loose-inviter";
import { type db } from "#src/db";

type DbClient = typeof db;

/**
 * Who may send a Group Lookup invite: the creator and Appointed Organizers on
 * any Group, plus Community Owner and Admin on a Club Group. Only staff may
 * invite someone who is not yet a Community Member, which auto-admits them.
 */
export async function requireGroupLookupSender(
  database: DbClient,
  groupId: string,
  callerId: string,
) {
  const group = await requireGroup(database, groupId);

  if (!group.communityId) {
    await requireLooseInviter(database, groupId, callerId);
    return { group, canAutoAdmit: false as const };
  }

  await requireLiveClubCommunity(database, group.communityId);

  const callerMembership = await requireCommunityMembership(
    database,
    group.communityId,
    callerId,
  );
  const isStaff = isStaffRole(callerMembership?.role);
  const isCreator = group.createdBy === callerId;
  const isOrganizer =
    !isStaff &&
    !isCreator &&
    (await isAppointedOrganizer(database, group, callerId));

  if (!isStaff && !isCreator && !isOrganizer) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Only Owner, Admin, this Group's creator, or an Organizer can send Lookup invites",
    });
  }

  return { group, canAutoAdmit: isStaff };
}
