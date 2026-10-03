import { eq } from "drizzle-orm";

import { games } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function groupHasGames(database: DbClient, groupId: string) {
  const game = await database.query.games.findFirst({
    where: eq(games.groupId, groupId),
    columns: { id: true },
  });
  return Boolean(game);
}
