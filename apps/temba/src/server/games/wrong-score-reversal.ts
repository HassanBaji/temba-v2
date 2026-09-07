import { and, desc, eq } from "drizzle-orm";

import { ratingEvents } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type WrongScoreReversalEligibility =
  | { eligible: true; reason?: undefined }
  | { eligible: false; reason: string };

/**
 * "Report a wrong score" (Option A, `.scratch/game-details-redesign/spec.md`
 * "Resolved decision"; ADR-0011 "Dispute and rating reversal"): a completed
 * Match's rating events are clean to reverse only when, for every seated
 * User, this Match's rating event is that User's most recent Rated Match for
 * the event's sport. Glicko-2 updates are sequential, so restoring stored
 * before-values is only correct when nothing has been built on top of them
 * since — checked per seated User, not just the caller/viewer.
 */
export async function wrongScoreReversalEligibility(
  database: DbClient,
  matchId: string,
): Promise<WrongScoreReversalEligibility> {
  const matchEvents = await database.query.ratingEvents.findMany({
    where: eq(ratingEvents.matchId, matchId),
  });
  if (matchEvents.length === 0) {
    return {
      eligible: false,
      reason: "This Match has no rating events to reverse",
    };
  }

  for (const event of matchEvents) {
    const [latest] = await database
      .select({ id: ratingEvents.id })
      .from(ratingEvents)
      .where(
        and(
          eq(ratingEvents.userId, event.userId),
          eq(ratingEvents.sport, event.sport),
        ),
      )
      .orderBy(desc(ratingEvents.createdAt), desc(ratingEvents.id))
      .limit(1);
    if (latest && latest.id !== event.id) {
      return {
        eligible: false,
        reason:
          "At least one player seated on this Match has a later rated Match — this needs manual support to correct",
      };
    }
  }

  return { eligible: true };
}
