import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { communities } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireCommunity(database: DbClient, id: string) {
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, id),
  });

  if (!community) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Community not found" });
  }

  return community;
}
