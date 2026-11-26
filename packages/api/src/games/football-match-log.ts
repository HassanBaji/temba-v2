import { asc, eq } from "drizzle-orm";

import { matchEvents } from "@repo/db";
import { type MatchLogLine } from "@repo/domain/football-match-log";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A football Match's log, in the order it was saved: oldest first. */
export async function loadMatchLog(
  database: DbClient,
  matchId: string,
): Promise<MatchLogLine[]> {
  const rows = await database.query.matchEvents.findMany({
    where: eq(matchEvents.matchId, matchId),
    columns: {
      id: true,
      kind: true,
      sideIndex: true,
      userId: true,
      minute: true,
      loggedAt: true,
      reason: true,
    },
    orderBy: asc(matchEvents.position),
  });
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    side: row.sideIndex === 1 ? 1 : 2,
    userId: row.userId,
    minute: row.minute,
    loggedAt: row.loggedAt,
    reason: row.reason,
  }));
}
