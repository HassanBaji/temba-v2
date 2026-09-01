import { GroupTypeEnum } from "@repo/db";

import { createClubGroup } from "~/server/groups/helpers/create-club-group";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function createClubPublic(
  database: DbClient,
  args: {
    communityId: string;
    name: string;
    description?: string;
    sport: "padel" | "football";
    userId: string;
  },
) {
  return createClubGroup({
    database,
    communityId: args.communityId,
    name: args.name,
    description: args.description,
    sport: args.sport,
    type: GroupTypeEnum.PUBLIC,
    createdBy: args.userId,
  });
}
