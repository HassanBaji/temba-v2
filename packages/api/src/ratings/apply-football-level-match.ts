import { and, count, eq, inArray, max, ne } from "drizzle-orm";

import {
  GroupSportEnum,
  levelOverrides,
  ratingEvents,
  ratings,
} from "@repo/db";

import { type db } from "#src/db";
import { sideUserIds } from "#src/ratings/apply-tier-match";
import {
  footballPhiAfterMatches,
  muFromOvr,
  ovrFromMu,
  rateFootballMatch,
  type FootballGoalsRole,
  type FootballOutcome,
} from "@repo/domain/football-ovr";
import {
  bandWithHysteresis,
  confirmedPhiForOverride,
  initialRatingFromChoice,
  levelFromMu,
  type LevelBand,
} from "@repo/domain/level";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type RatingRow = typeof ratings.$inferSelect;

const FOOTBALL = GroupSportEnum.FOOTBALL;

/** The Users whose football Level an Operator or Level setter ever set. */
async function overriddenUserIds(database: DbClient, userIds: string[]) {
  const rows = await database
    .selectDistinct({ userId: levelOverrides.userId })
    .from(levelOverrides)
    .where(
      and(
        eq(levelOverrides.sport, FOOTBALL),
        inArray(levelOverrides.userId, userIds),
      ),
    );
  return new Set(rows.map((row) => row.userId));
}

/**
 * Each User's counting football Matches, leaving out `exceptMatchId`, and
 * when the latest of them counted.
 */
async function countedMatches(
  database: DbClient,
  userIds: string[],
  exceptMatchId: string,
) {
  const rows = await database
    .select({
      userId: ratingEvents.userId,
      counted: count(),
      latest: max(ratingEvents.createdAt),
    })
    .from(ratingEvents)
    .where(
      and(
        eq(ratingEvents.sport, FOOTBALL),
        inArray(ratingEvents.userId, userIds),
        ne(ratingEvents.matchId, exceptMatchId),
      ),
    )
    .groupBy(ratingEvents.userId);
  return new Map(rows.map((row) => [row.userId, row]));
}

/**
 * φ for a football Rating with `counted` counting Matches (ADR-0069). A Level
 * an Operator or Level setter set stays confirmed, as ADR-0023 has it.
 */
export function footballPhi(counted: number, overridden: boolean) {
  const phi = footballPhiAfterMatches(counted);
  return overridden ? confirmedPhiForOverride(phi) : phi;
}

/**
 * The Temba Level move of a football Match on a Game that counts for it,
 * written when its Rating window settles (ADR-0069): one `rating_events` row
 * per seated account holder and Unclaimed player, with its four parts, and
 * the OVR step on their football Rating. φ is set from the count of counting
 * Matches, so a player is Provisional until their fifth; idle time never
 * grows it. Idempotent per User and Match.
 */
export async function applyFootballLevelMatch(
  database: DbClient,
  args: {
    matchId: string;
    slot1GameTeamId: string;
    slot2GameTeamId: string;
    result: FootballOutcome;
    weight: number;
    now: Date;
    score: { slot1: number; slot2: number } | null;
    /** Own named goals by User. */
    goals: ReadonlyMap<string, number>;
    goalsRoles: ReadonlyMap<string, FootballGoalsRole>;
    /** The Performance-rating score of each player with a settled rating. */
    performance: ReadonlyMap<string, number>;
    votedMvpUserId: string | null;
  },
): Promise<void> {
  const slot1 = await sideUserIds(database, args.slot1GameTeamId);
  const slot2 = await sideUserIds(database, args.slot2GameTeamId);
  if (slot1.length === 0 || slot2.length === 0) {
    return;
  }
  const seated = [...slot1, ...slot2];

  const existing = await database.query.ratingEvents.findMany({
    where: and(
      eq(ratingEvents.matchId, args.matchId),
      inArray(ratingEvents.userId, seated),
    ),
    columns: { userId: true },
  });
  const alreadyRated = new Set(existing.map((row) => row.userId));
  if (seated.every((userId) => alreadyRated.has(userId))) {
    return;
  }

  const start = initialRatingFromChoice("unknown");
  await database
    .insert(ratings)
    .values(
      [...seated].sort().map((userId) => ({
        userId,
        sport: FOOTBALL,
        ...start,
        createdAt: args.now,
        updatedAt: args.now,
      })),
    )
    .onConflictDoNothing({ target: [ratings.userId, ratings.sport] });

  // Locked in user-id order so a Level override, a reversal or another
  // Match on the same players serializes with this write.
  const rows = await database
    .select()
    .from(ratings)
    .where(and(inArray(ratings.userId, seated), eq(ratings.sport, FOOTBALL)))
    .orderBy(ratings.userId)
    .for("update");
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));
  const [counted, overridden] = await Promise.all([
    countedMatches(database, seated, args.matchId),
    overriddenUserIds(database, seated),
  ]);

  const player = (userId: string) => {
    const row = rowByUser.get(userId);
    return {
      userId,
      mu: row?.mu ?? start.mu,
      phi: row?.phi ?? start.phi,
      goals: args.goals.get(userId) ?? 0,
      goalsRole: args.goalsRoles.get(userId),
      performance: args.performance.get(userId) ?? null,
    };
  };
  const moves = rateFootballMatch({
    slot1: slot1.map(player),
    slot2: slot2.map(player),
    outcome: args.result,
    weight: args.weight,
    score: args.score,
    votedMvpUserId: args.votedMvpUserId,
  });

  for (const move of moves) {
    const row = rowByUser.get(move.userId);
    if (!row || alreadyRated.has(move.userId)) {
      continue;
    }
    const after = afterMove(row, {
      mu: muFromOvr(move.ovrAfter),
      counted: (counted.get(move.userId)?.counted ?? 0) + 1,
      overridden: overridden.has(move.userId),
    });
    const [inserted] = await database
      .insert(ratingEvents)
      .values({
        userId: move.userId,
        sport: FOOTBALL,
        matchId: args.matchId,
        outcomeScore: move.score,
        weight: args.weight,
        muBefore: row.mu,
        phiBefore: row.phi,
        sigmaBefore: row.sigma,
        muAfter: after.mu,
        phiAfter: after.phi,
        sigmaAfter: row.sigma,
        levelBandBefore: row.levelBand,
        lastRatedAtBefore: row.lastRatedAt,
        resultPart: move.resultPart,
        performancePart: move.performancePart,
        goalsPart: move.goalsPart,
        mvpPart: move.mvpPart,
        createdAt: args.now,
      })
      .onConflictDoNothing({
        target: [ratingEvents.userId, ratingEvents.matchId],
      })
      .returning({ id: ratingEvents.id });
    if (!inserted) {
      continue;
    }
    await database
      .update(ratings)
      .set({ ...after, lastRatedAt: args.now, updatedAt: args.now })
      .where(eq(ratings.id, row.id));
  }
}

function afterMove(
  row: Pick<RatingRow, "levelBand">,
  next: { mu: number; counted: number; overridden: boolean },
): { mu: number; phi: number; levelBand: LevelBand } {
  return {
    mu: next.mu,
    phi: footballPhi(next.counted, next.overridden),
    levelBand: bandWithHysteresis(levelFromMu(next.mu), row.levelBand),
  };
}

/**
 * Takes a football Match's Level moves back (ADR-0067, ADR-0069): each
 * event's step is subtracted from the player's μ whatever came after, the
 * events are deleted, and φ is set again from the Matches that still count.
 * A Level override set after the Match is the player's baseline, so their μ
 * stays as it is.
 */
export async function reverseFootballLevelMatch(
  database: DbClient,
  matchId: string,
  now: Date,
): Promise<void> {
  const events = await database.query.ratingEvents.findMany({
    where: and(
      eq(ratingEvents.matchId, matchId),
      eq(ratingEvents.sport, FOOTBALL),
    ),
  });
  if (events.length === 0) {
    return;
  }
  const userIds = events.map((event) => event.userId);
  const rows = await database
    .select()
    .from(ratings)
    .where(and(inArray(ratings.userId, userIds), eq(ratings.sport, FOOTBALL)))
    .orderBy(ratings.userId)
    .for("update");
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));
  const overrides = await database
    .select({
      userId: levelOverrides.userId,
      createdAt: levelOverrides.createdAt,
    })
    .from(levelOverrides)
    .where(
      and(
        eq(levelOverrides.sport, FOOTBALL),
        inArray(levelOverrides.userId, userIds),
      ),
    );

  await database
    .delete(ratingEvents)
    .where(
      and(eq(ratingEvents.matchId, matchId), eq(ratingEvents.sport, FOOTBALL)),
    );
  const counted = await countedMatches(database, userIds, matchId);

  for (const event of events) {
    const row = rowByUser.get(event.userId);
    if (!row) {
      continue;
    }
    const mine = overrides.filter(
      (override) => override.userId === event.userId,
    );
    const overriddenSince = mine.some(
      (override) => override.createdAt > event.createdAt,
    );
    const mu = overriddenSince
      ? row.mu
      : muFromOvr(ovrFromMu(row.mu - (event.muAfter - event.muBefore)));
    const left = counted.get(event.userId);
    await database
      .update(ratings)
      .set({
        ...afterMove(row, {
          mu,
          counted: left?.counted ?? 0,
          overridden: mine.length > 0,
        }),
        lastRatedAt: left?.latest ?? null,
        updatedAt: now,
      })
      .where(eq(ratings.id, row.id));
  }
}
