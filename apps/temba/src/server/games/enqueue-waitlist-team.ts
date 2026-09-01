import { and, eq } from "drizzle-orm";

import { gameWaitlist } from "@repo/db";

import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function enqueueWaitlistTeam(
  database: Tx | typeof db,
  gameId: string,
  teamId: string,
) {
  const existing = await database.query.gameWaitlist.findFirst({
    where: and(
      eq(gameWaitlist.gameId, gameId),
      eq(gameWaitlist.teamId, teamId),
    ),
    columns: { id: true },
  });
  if (existing) {
    return;
  }
  await database.insert(gameWaitlist).values({ gameId, teamId });
}
