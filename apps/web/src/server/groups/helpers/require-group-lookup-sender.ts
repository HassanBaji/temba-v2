import { TRPCError } from "@trpc/server";

import { isStaffRole } from "~/server/games/access";
import { requireCommunityMembership } from "~/server/groups/helpers/require-community-membership";
import { requireGroup } from "~/server/groups/helpers/require-group";
import { requireLiveClubCommunity } from "~/server/groups/helpers/require-live-club-community";
import { requireLooseCreator } from "~/server/groups/helpers/require-loose-creator";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function requireGroupLookupSender(
  database: DbClient,
  groupId: string,
  callerId: string,
) {
  const group = await requireGroup(database, groupId);

  if (!group.communityId) {
    await requireLooseCreator(database, groupId, callerId);
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

  if (!isStaff && !isCreator) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Only Owner, Admin, or this Group's creator can send Lookup invites",
    });
  }

  return { group, canAutoAdmit: isStaff };
}
