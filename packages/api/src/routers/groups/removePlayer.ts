import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isStaffRole } from "#src/games/access";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireCommunityMembership } from "#src/groups/helpers/require-community-membership";
import { requireGroup } from "#src/groups/helpers/require-group";
import { consult, refuseIfFrozen } from "#src/soft-archive";

type DbClient = typeof db;

export const CANNOT_REMOVE_CREATOR_MESSAGE =
  "The Group creator cannot be removed";
export const CANNOT_REMOVE_STAFF_MESSAGE =
  "Community Owner and Admin cannot be removed from a Club Group";
export const CANNOT_REMOVE_SELF_MESSAGE = "Leave the Group instead";

/**
 * A Group approver removing any player. The creator stays, and so do
 * Community Owner and Admin on a Club Group, since they outrank every Group
 * approver. The player's Games stay in history.
 */
export async function removePlayer(
  database: DbClient,
  args: { groupId: string; approverUserId: string; userId: string },
) {
  const group = await requireGroup(database, args.groupId);
  if (group.communityId) {
    refuseIfFrozen(
      await consult(database, { communityId: group.communityId }),
      "host",
      {
        frozenMessage:
          "Cannot remove players from a Group in an archived Community",
      },
    );
  }
  await assertGroupApprover(database, group, args.approverUserId);

  if (args.userId === args.approverUserId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: CANNOT_REMOVE_SELF_MESSAGE,
    });
  }
  if (args.userId === group.createdBy) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: CANNOT_REMOVE_CREATOR_MESSAGE,
    });
  }

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
    columns: { id: true },
  });
  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This player is not in the Group",
    });
  }

  if (group.communityId) {
    const communityMembership = await requireCommunityMembership(
      database,
      group.communityId,
      args.userId,
    );
    if (isStaffRole(communityMembership?.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: CANNOT_REMOVE_STAFF_MESSAGE,
      });
    }
  }

  await database.delete(groupMembers).where(eq(groupMembers.id, membership.id));

  return { ok: true as const, groupId: group.id, userId: args.userId };
}

export const removePlayerProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return removePlayer(ctx.db, {
      groupId: input.groupId,
      approverUserId: appUser.id,
      userId: input.userId,
    });
  });
