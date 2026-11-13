import { and, asc, eq, gt, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { matches, ratingEvents } from "@repo/db";
import { PROVISIONAL_PHI_THRESHOLD } from "@repo/domain/level";
import type { Sport } from "@repo/domain/sport";

import { type db } from "#src/db";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type LevelConfirmation = {
  /** The `rating_events` row of the Match that confirmed the Level. */
  eventId: string;
  userId: string;
  sport: Sport;
  matchId: string;
  muAfter: number;
  /** Counting Matches in the sport up to and including this one. */
  matchesCounted: number;
};

function shownAt(column: typeof ratingEvents.createdAt) {
  return sql`date_trunc('milliseconds', ${column})`;
}

/**
 * Where each User's Level was confirmed in a sport, derived from the ledger
 * (ADR-0073): the first counting Match that took φ out of Provisional, which
 * is when the hatched track clears. On football that is the fifth counting
 * Match. At most one per User and sport whatever φ does later, and none when
 * a Level override confirmed it first.
 */
export async function levelConfirmations(
  database: DbClient,
  args: { userIds: readonly string[]; sport?: Sport },
): Promise<LevelConfirmation[]> {
  const userIds = [...new Set(args.userIds)];
  if (userIds.length === 0) {
    return [];
  }
  const earlier = alias(ratingEvents, "earlier");
  return database
    .selectDistinctOn([ratingEvents.userId, ratingEvents.sport], {
      eventId: ratingEvents.id,
      userId: ratingEvents.userId,
      sport: ratingEvents.sport,
      matchId: ratingEvents.matchId,
      muAfter: ratingEvents.muAfter,
      matchesCounted: sql<number>`(
        select count(*)::int from ${earlier}
        where ${earlier.userId} = ${ratingEvents.userId}
          and ${earlier.sport} = ${ratingEvents.sport}
          and (date_trunc('milliseconds', ${earlier.createdAt}), ${earlier.id})
            <= (${shownAt(ratingEvents.createdAt)}, ${ratingEvents.id})
      )`.mapWith(Number),
    })
    .from(ratingEvents)
    .where(
      and(
        inArray(ratingEvents.userId, userIds),
        args.sport ? eq(ratingEvents.sport, args.sport) : undefined,
        gt(ratingEvents.phiBefore, PROVISIONAL_PHI_THRESHOLD),
        lte(ratingEvents.phiAfter, PROVISIONAL_PHI_THRESHOLD),
      ),
    )
    .orderBy(
      ratingEvents.userId,
      ratingEvents.sport,
      asc(shownAt(ratingEvents.createdAt)),
      asc(ratingEvents.id),
    );
}

/**
 * Tells each of `userIds` whose Level this Match confirmed, once per sport:
 * the dedupe key holds if a reversal and a later Match confirm it again.
 * Call it in the Match's rating transaction, after its `rating_events` rows.
 */
export async function notifyLevelConfirmed(
  database: DbClient,
  args: { matchId: string; sport: Sport; userIds: readonly string[] },
): Promise<void> {
  const confirmed = (
    await levelConfirmations(database, {
      userIds: args.userIds,
      sport: args.sport,
    })
  ).filter((row) => row.matchId === args.matchId);
  if (confirmed.length === 0) {
    return;
  }
  const match = await database.query.matches.findFirst({
    where: eq(matches.id, args.matchId),
    columns: { gameId: true },
  });
  await notify(database, {
    type: "level_confirmed",
    recipients: confirmed.map((row) => ({
      userId: row.userId,
      audience: "player" as const,
    })),
    excludeUserIds: [],
    gameId: match?.gameId ?? null,
    dedupeKey: `level_confirmed:${args.sport}`,
  });
}
