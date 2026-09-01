import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { gameTeams } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function assertGameTeamOnGame(
  database: DbClient,
  gameId: string,
  gameTeamId: string,
) {
  const row = await database.query.gameTeams.findFirst({
    where: and(eq(gameTeams.id, gameTeamId), eq(gameTeams.gameId, gameId)),
    columns: { id: true },
  });
  if (!row) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Game team is not on this Game",
    });
  }
}
