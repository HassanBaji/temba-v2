import { TRPCError } from "@trpc/server";

import { isStaffRole } from "~/server/games/access";
import { requireCommunityMembership } from "~/server/groups/helpers/require-community-membership";
import { type db } from "~/server/db";

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
