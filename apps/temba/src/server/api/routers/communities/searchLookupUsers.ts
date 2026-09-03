import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { communityMemberInvites, communityMembers } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { requireLiveCommunity } from "~/server/communities/helpers/require-live-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { type db } from "~/server/db";
import { searchLookupUsers as searchLookupUsersDoor } from "~/server/invites/search-lookup-users";

type DbClient = typeof db;

export async function searchLookupUsers(
  database: DbClient,
  args: { communityId: string; userId: string; query: string },
) {
  const community = await requireLiveCommunity(database, args.communityId);
  await requireStaff(database, community.id, args.userId);

  const members = await database.query.communityMembers.findMany({
    where: eq(communityMembers.communityId, community.id),
    columns: { userId: true },
  });
  const unusedInvites = await database.query.communityMemberInvites.findMany({
    where: and(
      eq(communityMemberInvites.communityId, community.id),
      isNull(communityMemberInvites.acceptedAt),
      isNull(communityMemberInvites.revokedAt),
    ),
    columns: { userId: true },
  });

  return searchLookupUsersDoor(database, {
    query: args.query,
    excludeUserIds: [
      args.userId,
      ...members.map((member) => member.userId),
      ...unusedInvites.map((invite) => invite.userId),
    ],
  });
}

export const searchLookupUsersProcedure = protectedProcedure
  .input(
    z.object({
      communityId: z.string().uuid(),
      query: z.string().trim().max(255),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return searchLookupUsers(ctx.db, {
      communityId: input.communityId,
      userId: appUser.id,
      query: input.query,
    });
  });
