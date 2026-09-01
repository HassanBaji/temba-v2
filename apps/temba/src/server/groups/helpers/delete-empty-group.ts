import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { groupEmailInvites, groupInviteLinks, groups } from "@repo/db";

import { groupHasGames } from "~/server/groups/helpers/group-has-games";
import { groupHasNonCreatorMembers } from "~/server/groups/helpers/group-has-non-creator-members";
import { requireGroup } from "~/server/groups/helpers/require-group";
import { requireStaff } from "~/server/groups/helpers/require-staff";
import { type db } from "~/server/db";

type DbClient = typeof db;

/**
 * Delete a Group that has only the creator and no Games.
 * Club Group: Owner or Admin. Loose Group: creator only.
 * Community is never hard-deleted here.
 */
export async function deleteEmptyGroup(args: {
  database: DbClient;
  groupId: string;
  callerId: string;
}) {
  const group = await requireGroup(args.database, args.groupId);

  if (group.communityId) {
    await requireStaff(
      args.database,
      group.communityId,
      args.callerId,
      "Only Owner or Admin can delete a Club Group",
    );
  } else if (group.createdBy !== args.callerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the creator can delete this Group",
    });
  }

  if (await groupHasGames(args.database, group.id)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot delete a Group that has Games",
    });
  }

  if (
    await groupHasNonCreatorMembers(args.database, group.id, group.createdBy)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot delete a Group that has members besides the creator",
    });
  }

  await args.database.transaction(async (tx) => {
    // Email invites and Invite links restrict on group delete — clear first.
    await tx
      .delete(groupEmailInvites)
      .where(eq(groupEmailInvites.groupId, group.id));
    await tx
      .delete(groupInviteLinks)
      .where(eq(groupInviteLinks.groupId, group.id));
    // group_members and group_member_invites cascade from groups.
    await tx.delete(groups).where(eq(groups.id, group.id));
  });

  return {
    ok: true as const,
    groupId: group.id,
    communityId: group.communityId,
  };
}
