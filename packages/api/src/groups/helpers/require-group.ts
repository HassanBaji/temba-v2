import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { groups } from "@repo/db";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A deleted Group is gone for every door; its Games stay reachable on their own. */
export async function requireGroup(database: DbClient, groupId: string) {
  const group = await database.query.groups.findFirst({
    where: and(eq(groups.id, groupId), isNull(groups.deletedAt)),
  });

  if (!group) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
  }

  return group;
}
