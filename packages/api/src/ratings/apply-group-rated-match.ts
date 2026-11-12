import { and, eq, inArray } from "drizzle-orm";

import { groupRatingEvents, groupRatings, ratings } from "@repo/db";

import { type db } from "#src/db";
import { isUniqueViolation } from "#src/db/is-unique-violation";
import { groupRatingStart } from "@repo/domain/group-level";
import { withGuestStandIns } from "#src/ratings/guest-stand-ins";
import type { RatingGlickoState } from "@repo/domain/level";
import {
  rateDoublesMatch,
  type DoublesOutcome,
} from "@repo/domain/rate-doubles-match";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A Group Level reads one Group, so every group rated Match weighs the same. */
export const GROUP_RATING_WEIGHT = 1;

type Slots = {
  slot1: [string, string];
  slot2: [string, string];
};

/**
 * Group Levels for the four Users of a completed Match on a group rated Game
 * (ADR-0053). A User without one starts from their Temba Rating, Provisional.
 * A Guest player plays at the mean of the others and gets no Group Level
 * (ADR-0079). Idempotent per User+Match.
 */
export async function applyGroupRatedMatch(
  database: DbClient,
  args: {
    groupId: string;
    sport: "padel" | "football";
    matchId: string;
    slots: Slots;
    guestIds: ReadonlySet<string>;
    result: DoublesOutcome;
    now: Date;
  },
): Promise<void> {
  const userIds = [...args.slots.slot1, ...args.slots.slot2];

  const existingEvents = await database.query.groupRatingEvents.findMany({
    where: and(
      eq(groupRatingEvents.matchId, args.matchId),
      inArray(groupRatingEvents.userId, userIds),
    ),
    columns: { userId: true },
  });
  const alreadyRated = new Set(existingEvents.map((row) => row.userId));

  // Locked in user-id order, like the Temba rows, so a Group Level override
  // or reversal on the same rows serializes with this write.
  const groupRows = await database
    .select()
    .from(groupRatings)
    .where(
      and(
        inArray(groupRatings.userId, userIds),
        eq(groupRatings.groupId, args.groupId),
      ),
    )
    .orderBy(groupRatings.userId)
    .for("update");
  const groupRowByUser = new Map(groupRows.map((row) => [row.userId, row]));

  const missing = userIds.filter((userId) => !groupRowByUser.has(userId));
  const tembaRows =
    missing.length === 0
      ? []
      : await database.query.ratings.findMany({
          where: and(
            inArray(ratings.userId, missing),
            eq(ratings.sport, args.sport),
          ),
          columns: { userId: true, mu: true, phi: true, sigma: true },
        });
  const tembaByUser = new Map(tembaRows.map((row) => [row.userId, row]));

  const stateOf = (userId: string): RatingGlickoState => {
    const row = groupRowByUser.get(userId);
    if (row) {
      return {
        mu: row.mu,
        phi: row.phi,
        sigma: row.sigma,
        levelBand: row.levelBand,
      };
    }
    return groupRatingStart(tembaByUser.get(userId) ?? null);
  };
  const playerInput = withGuestStandIns(userIds, args.guestIds, (userId) => ({
    state: stateOf(userId),
    lastRatedAt: groupRowByUser.get(userId)?.lastRatedAt,
  }));

  const rated = rateDoublesMatch({
    slot1: [playerInput(args.slots.slot1[0]), playerInput(args.slots.slot1[1])],
    slot2: [playerInput(args.slots.slot2[0]), playerInput(args.slots.slot2[1])],
    outcome: args.result,
    weight: GROUP_RATING_WEIGHT,
    now: args.now,
  });

  const players = [
    { userId: args.slots.slot1[0], ...rated.slot1[0] },
    { userId: args.slots.slot1[1], ...rated.slot1[1] },
    { userId: args.slots.slot2[0], ...rated.slot2[0] },
    { userId: args.slots.slot2[1], ...rated.slot2[1] },
  ];

  for (const player of players) {
    if (alreadyRated.has(player.userId) || args.guestIds.has(player.userId)) {
      continue;
    }
    const { before, after, score, levelBand } = player;

    try {
      const [inserted] = await database
        .insert(groupRatingEvents)
        .values({
          userId: player.userId,
          groupId: args.groupId,
          matchId: args.matchId,
          outcomeScore: score,
          weight: GROUP_RATING_WEIGHT,
          muBefore: before.mu,
          phiBefore: before.phi,
          sigmaBefore: before.sigma,
          muAfter: after.mu,
          phiAfter: after.phi,
          sigmaAfter: after.sigma,
          levelBandBefore: stateOf(player.userId).levelBand,
          lastRatedAtBefore:
            groupRowByUser.get(player.userId)?.lastRatedAt ?? null,
          createdAt: args.now,
        })
        .onConflictDoNothing({
          target: [groupRatingEvents.userId, groupRatingEvents.matchId],
        })
        .returning({ id: groupRatingEvents.id });
      if (!inserted) {
        continue;
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue;
      }
      throw error;
    }

    const values = {
      mu: after.mu,
      phi: after.phi,
      sigma: after.sigma,
      levelBand,
      lastRatedAt: args.now,
      updatedAt: args.now,
    };
    await database
      .insert(groupRatings)
      .values({ userId: player.userId, groupId: args.groupId, ...values })
      .onConflictDoUpdate({
        target: [groupRatings.userId, groupRatings.groupId],
        set: values,
      });
  }
}
