import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, GroupMemberRoleEnum } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isStaffRole } from "#src/games/access";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireCommunityMembership } from "#src/groups/helpers/require-community-membership";
import { requireGroup } from "#src/groups/helpers/require-group";
import { consult, refuseIfFrozen } from "#src/soft-archive";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db;

export const ALWAYS_ORGANIZER_MESSAGE =
  "The Group creator and Community Owner and Admin are always Organizers";
export const UNCLAIMED_ORGANIZER_MESSAGE =
  "Players not on Temba yet cannot be Organizers";
export const NOT_A_COMMUNITY_MEMBER_ORGANIZER_MESSAGE =
  "Only Community Members can be Organizers of this Group";

export async function setOrganizer(
  database: DbClient,
  args: {
    groupId: string;
    approverUserId: string;
    userId: string;
    organizer: boolean;
  },
) {
  const group = await requireGroup(database, args.groupId);
  if (group.communityId) {
    refuseIfFrozen(
      await consult(database, { communityId: group.communityId }),
      "host",
      {
        frozenMessage:
          "Cannot change Organizers of a Group in an archived Community",
      },
    );
  }
  await assertGroupApprover(database, group, args.approverUserId);

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
    columns: { id: true },
    with: { user: { columns: { clerkId: true, addedAt: true } } },
  });
  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This player is not in the Group",
    });
  }

  const communityMembership = group.communityId
    ? await requireCommunityMembership(database, group.communityId, args.userId)
    : null;
  if (
    group.createdBy === args.userId ||
    isStaffRole(communityMembership?.role)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ALWAYS_ORGANIZER_MESSAGE,
    });
  }
  if (args.organizer && isUnclaimed(membership.user)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: UNCLAIMED_ORGANIZER_MESSAGE,
    });
  }
  if (args.organizer && group.communityId && !communityMembership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: NOT_A_COMMUNITY_MEMBER_ORGANIZER_MESSAGE,
    });
  }

  await database
    .update(groupMembers)
    .set({
      role: args.organizer
        ? GroupMemberRoleEnum.ORGANIZER
        : GroupMemberRoleEnum.MEMBER,
      updatedAt: new Date(),
    })
    .where(eq(groupMembers.id, membership.id));

  return {
    ok: true as const,
    groupId: group.id,
    userId: args.userId,
    organizer: args.organizer,
  };
}

export const setOrganizerProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
      organizer: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setOrganizer(ctx.db, {
      groupId: input.groupId,
      approverUserId: appUser.id,
      userId: input.userId,
      organizer: input.organizer,
    });
  });
