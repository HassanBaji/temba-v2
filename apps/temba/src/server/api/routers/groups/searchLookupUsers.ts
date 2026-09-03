import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { communityMembers, groupMemberInvites, groupMembers } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requireGroupLookupSender } from "~/server/groups/helpers/require-group-lookup-sender";
import { searchLookupUsers as searchLookupUsersDoor } from "~/server/invites/search-lookup-users";

type DbClient = typeof db;

export async function searchLookupUsers(
  database: DbClient,
  args: { groupId: string; userId: string; query: string },
) {
  const { group, canAutoAdmit } = await requireGroupLookupSender(
    database,
    args.groupId,
    args.userId,
  );

  const members = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, group.id),
    columns: { userId: true },
  });
  const unusedInvites = await database.query.groupMemberInvites.findMany({
    where: and(
      eq(groupMemberInvites.groupId, group.id),
      isNull(groupMemberInvites.acceptedAt),
      isNull(groupMemberInvites.revokedAt),
    ),
    columns: { userId: true },
  });

  const excludeUserIds = [
    args.userId,
    ...members.map((member) => member.userId),
    ...unusedInvites.map((invite) => invite.userId),
  ];

  if (group.communityId && !canAutoAdmit) {
    const communityMembersRows = await database.query.communityMembers.findMany(
      {
        where: eq(communityMembers.communityId, group.communityId),
        columns: { userId: true },
      },
    );

    return searchLookupUsersDoor(database, {
      query: args.query,
      excludeUserIds,
      includeUserIds: communityMembersRows.map((row) => row.userId),
    });
  }

  return searchLookupUsersDoor(database, {
    query: args.query,
    excludeUserIds,
  });
}

export const searchLookupUsersProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      query: z.string().trim().max(255),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return searchLookupUsers(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
      query: input.query,
    });
  });
