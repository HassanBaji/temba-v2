import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { communityMembers } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { asRole } from "~/server/communities/helpers/as-role";
import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireMembership } from "~/server/communities/helpers/require-membership";
import { type CommunityMember } from "~/server/communities/utils";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function listMembers(
  database: DbClient,
  args: { communityId: string; userId: string },
): Promise<CommunityMember[]> {
  const community = await requireCommunity(database, args.communityId);

  const membership = await requireMembership(
    database,
    community.id,
    args.userId,
  );

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Community members can list members",
    });
  }

  const rows = await database.query.communityMembers.findMany({
    where: eq(communityMembers.communityId, community.id),
    with: {
      user: true,
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    role: asRole(row.role),
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      image: row.user.image,
    },
  }));
}

export const listMembersProcedure = protectedProcedure
  .input(z.object({ communityId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listMembers(ctx.db, {
      communityId: input.communityId,
      userId: appUser.id,
    });
  });
