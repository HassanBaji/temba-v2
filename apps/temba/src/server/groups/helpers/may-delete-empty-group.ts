import { isStaffRole } from "~/server/games/access";
import { groupHasGames } from "~/server/groups/helpers/group-has-games";
import { groupHasNonCreatorMembers } from "~/server/groups/helpers/group-has-non-creator-members";
import { requireCommunityMembership } from "~/server/groups/helpers/require-community-membership";
import { type GroupRow } from "~/server/groups/utils";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function mayDeleteEmptyGroup(args: {
  database: DbClient;
  group: GroupRow;
  callerId: string;
}) {
  if (args.group.communityId) {
    const membership = await requireCommunityMembership(
      args.database,
      args.group.communityId,
      args.callerId,
    );
    if (!membership || !isStaffRole(membership.role)) {
      return false;
    }
  } else if (args.group.createdBy !== args.callerId) {
    return false;
  }

  if (await groupHasGames(args.database, args.group.id)) {
    return false;
  }

  if (
    await groupHasNonCreatorMembers(
      args.database,
      args.group.id,
      args.group.createdBy,
    )
  ) {
    return false;
  }

  return true;
}
