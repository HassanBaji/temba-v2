import { and, eq } from "drizzle-orm";

import { communityMembers, CommunityRoleEnum } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db;

export async function lockOwnersForUpdate(
  tx: Parameters<Parameters<DbClient["transaction"]>[0]>[0],
  communityId: string,
) {
  return tx
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.role, CommunityRoleEnum.OWNER),
      ),
    )
    .for("update");
}
