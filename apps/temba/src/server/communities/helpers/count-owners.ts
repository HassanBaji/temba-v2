import { and, eq } from "drizzle-orm";

import { communityMembers, CommunityRoleEnum } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function countOwners(database: DbClient, communityId: string) {
  const owners = await database.query.communityMembers.findMany({
    where: and(
      eq(communityMembers.communityId, communityId),
      eq(communityMembers.role, CommunityRoleEnum.OWNER),
    ),
  });

  return owners.length;
}
