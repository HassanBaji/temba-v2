import { TRPCError } from "@trpc/server";

import { requireMembership } from "~/server/communities/helpers/require-membership";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireOwner(
  database: DbClient,
  communityId: string,
  userId: string,
) {
  const membership = await requireMembership(database, communityId, userId);

  if (membership?.role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Owners can change Community roles",
    });
  }

  return membership;
}
