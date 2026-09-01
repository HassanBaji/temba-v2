import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { communities, groupMembers, GroupTypeEnum } from "@repo/db";

import { requireCommunityMembership } from "~/server/groups/helpers/require-community-membership";
import { requireGroup } from "~/server/groups/helpers/require-group";
import { consult, refuseIfFrozen } from "~/server/soft-archive";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function joinClubPublic(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  const group = await requireGroup(database, args.groupId);

  if (!group.communityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This is not a Club Group",
    });
  }

  if (group.type !== GroupTypeEnum.PUBLIC) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Club Group Private cannot be joined without an invite",
    });
  }

  const community = await database.query.communities.findFirst({
    where: eq(communities.id, group.communityId),
  });

  if (!community) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Community not found",
    });
  }

  refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "join", {
    frozenMessage: "Cannot join a Group in an archived Community",
  });

  const communityMembership = await requireCommunityMembership(
    database,
    group.communityId,
    args.userId,
  );

  if (!communityMembership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a Community member to join its Club Groups",
    });
  }

  const existing = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already a member of this Group",
    });
  }

  const [created] = await database
    .insert(groupMembers)
    .values({
      groupId: group.id,
      userId: args.userId,
    })
    .returning();

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to join Group",
    });
  }

  return { ok: true as const, groupId: group.id };
}
