import { and, eq } from "drizzle-orm";

import { ratingEvents, ratings } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function userHasRatedMatch(
  database: DbClient,
  userId: string,
  sport: "padel" | "football",
): Promise<boolean> {
  const event = await database.query.ratingEvents.findFirst({
    where: and(eq(ratingEvents.userId, userId), eq(ratingEvents.sport, sport)),
    columns: { id: true },
  });
  if (event) {
    return true;
  }

  const row = await database.query.ratings.findFirst({
    where: and(eq(ratings.userId, userId), eq(ratings.sport, sport)),
    columns: { lastRatedAt: true },
  });
  return Boolean(row?.lastRatedAt);
}
