import { eq } from "drizzle-orm";

import { groupMembers, type GroupSportEnum } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db;

export async function mine(database: DbClient, args: { userId: string }) {
  console.time("mine");
  const userId = args.userId;
  console.timeEnd("mine");
  console.time("findMany");
  const memberships = await database.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
    with: {
      group: {
        with: {
          community: true,
        },
      },
    },
  });
  console.timeEnd("findMany");
  return memberships.map((membership) => {
    const group = membership.group;
    const community = group.community;

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      type: group.type,
      sport: group.sport as GroupSportEnum | null,
      community: community
        ? {
            id: community.id,
            name: community.name,
            archivedAt: community.archivedAt,
          }
        : null,
    };
  });
}
