import { and, eq } from "drizzle-orm";

import { communityMembers } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireMembership(
  database: DbClient,
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
