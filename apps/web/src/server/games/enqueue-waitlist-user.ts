import { and, eq } from "drizzle-orm";

import { gameWaitlist } from "@repo/db";

import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function enqueueWaitlistUser(
  database: Tx | typeof db,
  gameId: string,
  userId: string,
) {
  const existing = await database.query.gameWaitlist.findFirst({
    where: and(
      eq(gameWaitlist.gameId, gameId),
      eq(gameWaitlist.userId, userId),
    ),
    columns: { id: true },
  });
  if (existing) {
    return;
  }
  await database.insert(gameWaitlist).values({ gameId, userId });
}
