import { eq } from "drizzle-orm";

import { groupMembers, type GroupSportEnum } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db;

export async function mineLoose(database: DbClient, args: { userId: string }) {
  const memberships = await database.query.groupMembers.findMany({
    where: eq(groupMembers.userId, args.userId),
    with: {
      group: true,
    },
  });

  return memberships
    .filter((membership) => membership.group.communityId === null)
    .map((membership) => ({
      id: membership.group.id,
      name: membership.group.name,
      description: membership.group.description,
      type: membership.group.type,
      sport: membership.group.sport as GroupSportEnum | null,
    }));
}
