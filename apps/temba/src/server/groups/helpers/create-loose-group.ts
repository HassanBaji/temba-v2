import { TRPCError } from "@trpc/server";

import {
  groupMembers,
  groups,
  type GroupSportEnum,
  type GroupTypeEnum,
} from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db;

export async function createLooseGroup(args: {
  database: DbClient;
  name: string;
  description?: string;
  sport: "padel" | "football";
  type: GroupTypeEnum;
  createdBy: string;
}) {
  const created = await args.database.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({
        name: args.name,
        description: args.description,
        type: args.type,
        sport: args.sport,
        communityId: null,
        createdBy: args.createdBy,
      })
      .returning();

    if (!group) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Group",
      });
    }

    await tx.insert(groupMembers).values({
      groupId: group.id,
      userId: args.createdBy,
    });

    return group;
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description,
    type: created.type,
    sport: created.sport as GroupSportEnum,
    communityId: created.communityId,
    createdBy: created.createdBy,
    createdAt: created.createdAt,
  };
}
