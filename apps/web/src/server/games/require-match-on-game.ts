import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { matches } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireMatchOnGame(
  database: DbClient,
  gameId: string,
  matchId: string,
) {
  const match = await database.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (match?.gameId !== gameId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Match not found",
    });
  }
  return match;
}
