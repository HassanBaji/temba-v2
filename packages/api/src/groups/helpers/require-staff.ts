import { TRPCError } from "@trpc/server";

import { isStaffRole } from "#src/games/access";
import { requireCommunityMembership } from "#src/groups/helpers/require-community-membership";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireStaff(
  database: DbClient,
  communityId: string,
  userId: string,
  message = "Only Owner or Admin can create a Club Group",
) {
  const membership = await requireCommunityMembership(
    database,
    communityId,
    userId,
  );

  if (!membership || !isStaffRole(membership.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message,
    });
  }

  return membership;
}
