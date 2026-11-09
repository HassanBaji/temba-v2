import { and, desc, eq } from "drizzle-orm";

import { groupRatingEvents, ratingEvents } from "@repo/db";

import { type db } from "#src/db";

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
 * since — checked per seated User, not just the caller/viewer. A Match with
 * no rating events (an Unrated Game) has nothing to reverse and just reopens
 * (ADR-0062).
 */
export async function wrongScoreReversalEligibility(
  database: DbClient,
  matchId: string,
): Promise<WrongScoreReversalEligibility> {
  const [matchEvents, groupEvents] = await Promise.all([
    database.query.ratingEvents.findMany({
      where: eq(ratingEvents.matchId, matchId),
    }),
    database.query.groupRatingEvents.findMany({
      where: eq(groupRatingEvents.matchId, matchId),
    }),
  ]);
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

  // A Group Level is sequential per Group, so the same rule holds per Group.
  for (const event of groupEvents) {
    const [latest] = await database
      .select({ id: groupRatingEvents.id })
      .from(groupRatingEvents)
      .where(
        and(
          eq(groupRatingEvents.userId, event.userId),
          eq(groupRatingEvents.groupId, event.groupId),
        ),
      )
      .orderBy(desc(groupRatingEvents.createdAt), desc(groupRatingEvents.id))
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
