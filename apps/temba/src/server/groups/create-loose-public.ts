import { GroupTypeEnum } from "@repo/db";

import { createLooseGroup } from "~/server/groups/helpers/create-loose-group";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function createLoosePublic(
  database: DbClient,
  args: {
    name: string;
    description?: string;
    sport: "padel" | "football";
    userId: string;
  },
) {
  return createLooseGroup({
    database,
    name: args.name,
    description: args.description,
    sport: args.sport,
    type: GroupTypeEnum.PUBLIC,
    createdBy: args.userId,
  });
}
