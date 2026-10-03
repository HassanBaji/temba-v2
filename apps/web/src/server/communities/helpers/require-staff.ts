import { TRPCError } from "@trpc/server";

import { isStaffRole } from "~/server/games/access";
import { requireMembership } from "~/server/communities/helpers/require-membership";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireStaff(
  database: DbClient,
  communityId: string,
  userId: string,
  message = "Only Owner or Admin can manage this Community",
) {
  const membership = await requireMembership(database, communityId, userId);

  if (!membership || !isStaffRole(membership.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message,
    });
  }

  return membership;
}
