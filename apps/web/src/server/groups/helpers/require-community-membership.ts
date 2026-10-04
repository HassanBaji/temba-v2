import type { DbClient, DbTx } from "@repo/db";
import { and, eq } from "drizzle-orm";

import { communityMembers } from "@repo/db";

type DbOrTx = DbClient | DbTx;

export async function requireCommunityMembership(
  database: DbOrTx,
  communityId: string,
  userId: string,
) {
  const membership = await database.query.communityMembers.findFirst({
    where: and(
      eq(communityMembers.communityId, communityId),
      eq(communityMembers.userId, userId),
    ),
  });

  return membership ?? null;
}
