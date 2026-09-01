import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { groups } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireGroup(database: DbClient, groupId: string) {
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });
  if (!group) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Group not found",
    });
  }
  return group;
}
