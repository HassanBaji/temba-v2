import { and, desc, eq, gt, inArray, lt, lte, ne } from "drizzle-orm";

import {
  GroupSportEnum,
  levelCheckBallots,
  levelCheckResults,
  levelOverrides,
  matches,
  matchRatingWindows,
  ratingEvents,
  ratings,
} from "@repo/db";
import { padelMatchesRemainingToConfirm } from "@repo/domain/level";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import {
  LEVEL_CHECK_OUTLIER_MATCHES_RUNNING,
  levelCheckRaterDistances,
  levelCheckRaterWeights,
  levelCheckStep,
  levelCheckVerdicts,
  levelCheckVerdictHundredths,
  levelCheckVerdictLevel,
  type LevelCheckAnswer,
  type WeighedLevelCheckAnswer,
  type PreviousLevelCheckDistances,
} from "@repo/domain/level-check";

import { type db } from "#src/db";
import { sideUserIds } from "#src/ratings/apply-tier-match";
import { ratingWeightForGame } from "#src/ratings/game-rating-weight";
import { padelConfirmations } from "#src/ratings/level-confirmed";
import { withoutMuMove } from "#src/ratings/without-mu-move";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const PADEL = GroupSportEnum.PADEL;

export type SidedMatch = Pick<
  typeof matches.$inferSelect,
  "id" | "slot1GameTeamId" | "slot2GameTeamId"
>;

/**
 * Whether the API asks the Level check at all: off unless
 * `PADEL_LEVEL_CHECK_ENABLED` is "1". The Level recalculation refuses once a
 * Level check has settled, so the check is turned on only after the
 * recalculation's production run (ADR-0101).
 */
export function levelCheckEnabled() {
  return process.env.PADEL_LEVEL_CHECK_ENABLED === "1";
}

/**
 * A Rating window asks the Level check when the check is on and the window
 * is a padel one that counts for Temba Level: a padel Friendly game on a
 * Verified Group (ADR-0095) or a padel Public Game whose score both sides
 * confirmed. Football windows, tier Groups, tournaments and Challenge Games
 * open no such window.
 */
export function levelCheckAsked(
  window: { countsForLevel: boolean },
  sport: "padel" | "football",
) {
  return levelCheckEnabled() && window.countsForLevel && sport === "padel";
}

/**
 * The answers a Level check counts on a Match: from a seated player about
 * another seated player, each marked by whether the rater sat on the
 * opposing Game team. A Guest player is seated on neither side.
 */
export async function countedLevelCheckAnswers(
  database: DbClient,
  match: SidedMatch,
): Promise<LevelCheckAnswer[]> {
  const [slot1, slot2] = await Promise.all(
    [match.slot1GameTeamId, match.slot2GameTeamId].map(async (gameTeamId) =>
      gameTeamId
        ? new Set(await sideUserIds(database, gameTeamId))
        : new Set<string>(),
    ),
  );
  const sideOf = (userId: string) =>
    slot1?.has(userId) ? 1 : slot2?.has(userId) ? 2 : null;
  const ballots = await database
    .select({
      raterUserId: levelCheckBallots.raterUserId,
      rateeUserId: levelCheckBallots.rateeUserId,
      band: levelCheckBallots.band,
    })
    .from(levelCheckBallots)
    .where(eq(levelCheckBallots.matchId, match.id));
  return ballots.flatMap((ballot) => {
    const raterSide = sideOf(ballot.raterUserId);
    const rateeSide = sideOf(ballot.rateeUserId);
    return raterSide === null || rateeSide === null
      ? []
      : [
          {
            raterUserId: ballot.raterUserId,
            rateeUserId: ballot.rateeUserId,
            band: displayLabelFromStoredBand(ballot.band),
            fromOpponent: raterSide !== rateeSide,
          },
        ];
  });
}

/** The counted answers on a Match, by the player they are about. */
export async function levelCheckAnswersByPlayer(
  database: DbClient,
  match: SidedMatch,
): Promise<Map<string, WeighedLevelCheckAnswer[]>> {
  const picks = new Map<string, WeighedLevelCheckAnswer[]>();
  for (const ballot of await countedLevelCheckAnswers(database, match)) {
    const list = picks.get(ballot.rateeUserId) ?? [];
    list.push({ band: ballot.band, fromOpponent: ballot.fromOpponent });
    picks.set(ballot.rateeUserId, list);
  }
  return picks;
}

/**
 * Each rater's mean distance from the verdicts in their previous two Matches
 * with a Level check before this one, newest first: Matches they answered on
 * whose window had settled by `settledBefore`. Read from the stored answers
 * and results.
 */
export async function previousLevelCheckDistances(
  database: DbClient,
  args: {
    match: Pick<typeof matches.$inferSelect, "id" | "completedAt">;
    raterUserIds: readonly string[];
    settledBefore: Date;
  },
): Promise<PreviousLevelCheckDistances> {
  const distances = new Map<string, (number | null)[]>();
  for (const raterUserId of args.raterUserIds) {
    const previous = await database
      .selectDistinct({
        matchId: levelCheckBallots.matchId,
        completedAt: matches.completedAt,
      })
      .from(levelCheckBallots)
      .innerJoin(
        matchRatingWindows,
        eq(matchRatingWindows.matchId, levelCheckBallots.matchId),
      )
      .innerJoin(matches, eq(matches.id, levelCheckBallots.matchId))
      .where(
        and(
          eq(levelCheckBallots.raterUserId, raterUserId),
          ne(levelCheckBallots.matchId, args.match.id),
          lte(matchRatingWindows.settledAt, args.settledBefore),
          args.match.completedAt
            ? lt(matches.completedAt, args.match.completedAt)
            : undefined,
        ),
      )
      .orderBy(desc(matches.completedAt))
      .limit(LEVEL_CHECK_OUTLIER_MATCHES_RUNNING - 1);
    const row: (number | null)[] = [];
    for (const { matchId } of previous) {
      const ballots = await database
        .select({
          raterUserId: levelCheckBallots.raterUserId,
          rateeUserId: levelCheckBallots.rateeUserId,
          band: levelCheckBallots.band,
        })
        .from(levelCheckBallots)
        .where(
          and(
            eq(levelCheckBallots.matchId, matchId),
            eq(levelCheckBallots.raterUserId, raterUserId),
          ),
        );
      const results = await database
        .select({
          userId: levelCheckResults.userId,
          verdictLevelHundredths: levelCheckResults.verdictLevelHundredths,
        })
        .from(levelCheckResults)
        .where(
          and(
            eq(levelCheckResults.matchId, matchId),
            inArray(
              levelCheckResults.userId,
              ballots.map((ballot) => ballot.rateeUserId),
            ),
          ),
        );
      row.push(
        levelCheckRaterDistances(
          ballots.map((ballot) => ({
            ...ballot,
            band: displayLabelFromStoredBand(ballot.band),
          })),
          new Map(
            results.map((result) => [
              result.userId,
              levelCheckVerdictLevel(result.verdictLevelHundredths),
            ]),
          ),
        ).get(raterUserId) ?? null,
      );
    }
    distances.set(raterUserId, row);
  }
  return distances;
}

/**
 * Each rater's weight in this Match's Level check, as they stand when the
 * window settles: half for a Provisional padel Level, half again for an
 * outlier. Read from the ledger and the stored answers; nothing is written.
 */
async function levelCheckWeights(
  database: DbClient,
  args: {
    match: SidedMatch & Pick<typeof matches.$inferSelect, "completedAt">;
    ballots: readonly LevelCheckAnswer[];
    now: Date;
  },
) {
  const raterUserIds = [
    ...new Set(args.ballots.map((ballot) => ballot.raterUserId)),
  ];
  const [confirmationOf, previousDistances] = await Promise.all([
    padelConfirmations(database, { userIds: raterUserIds }),
    previousLevelCheckDistances(database, {
      match: args.match,
      raterUserIds,
      settledBefore: args.now,
    }),
  ]);
  return levelCheckRaterWeights(args.ballots, {
    provisionalRaterIds: new Set(
      raterUserIds.filter(
        (userId) => padelMatchesRemainingToConfirm(confirmationOf(userId)) > 0,
      ),
    ),
    previousDistances,
  });
}

/**
 * The Game's weight as the Match's Rated Match stored it, so a Group that
 * gained or lost its Venue while the window was open leaves the check at the
 * Match's weight. Read from the Group only for a Match with no padel events.
 */
async function matchWeight(
  database: DbClient,
  args: {
    match: SidedMatch;
    game: { groupId: string | null; isPublic: boolean };
  },
) {
  const [event] = await database
    .select({ weight: ratingEvents.weight })
    .from(ratingEvents)
    .where(
      and(
        eq(ratingEvents.matchId, args.match.id),
        eq(ratingEvents.sport, PADEL),
      ),
    )
    .limit(1);
  return event?.weight ?? (await ratingWeightForGame(database, args.game));
}

/**
 * Settles a padel Match's Level check with its Rating window: each player
 * with enough answers, one of them from an opponent, gets the verdict, the
 * weighted median of the answers, blended into their Level at the Game's
 * weight, and one result row keeps the verdict and the Rating either side.
 * Not a rating event: it is not a Rated Match, and `last_rated_at`, σ and
 * Reliability stay. Writes nothing for a Match that already has results, so
 * settling twice writes once. Returns the players it settled.
 */
export async function settleLevelChecks(
  database: DbClient,
  args: {
    match: SidedMatch & Pick<typeof matches.$inferSelect, "completedAt">;
    game: { groupId: string | null; isPublic: boolean };
    now: Date;
  },
): Promise<string[]> {
  const existing = await database
    .select({ id: levelCheckResults.id })
    .from(levelCheckResults)
    .where(eq(levelCheckResults.matchId, args.match.id))
    .limit(1);
  if (existing.length > 0) {
    return [];
  }
  const ballots = await countedLevelCheckAnswers(database, args.match);
  const weights = await levelCheckWeights(database, {
    match: args.match,
    ballots,
    now: args.now,
  });
  const verdicts = [...levelCheckVerdicts(ballots, weights)].flatMap(
    ([userId, verdict]) =>
      verdict.kind === "verdict" ? [{ userId, verdict }] : [],
  );
  if (verdicts.length === 0) {
    return [];
  }
  // Locked in user-id order, as every other writer of these rows locks them.
  const rows = await database
    .select()
    .from(ratings)
    .where(
      and(
        inArray(
          ratings.userId,
          verdicts.map((row) => row.userId),
        ),
        eq(ratings.sport, PADEL),
      ),
    )
    .orderBy(ratings.userId)
    .for("update");
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));
  const weight = await matchWeight(database, args);

  const settled: string[] = [];
  for (const { userId, verdict } of verdicts) {
    const row = rowByUser.get(userId);
    if (!row) {
      continue;
    }
    const step = levelCheckStep(row, verdict, weight);
    await database
      .update(ratings)
      .set({
        mu: step.mu,
        phi: step.phi,
        levelBand: step.levelBand,
        updatedAt: args.now,
      })
      .where(eq(ratings.id, row.id));
    await database.insert(levelCheckResults).values({
      userId,
      sport: PADEL,
      matchId: args.match.id,
      verdictLevelHundredths: levelCheckVerdictHundredths(verdict.level),
      agreed: step.agreed,
      ballotsCounted: verdict.ballotsCounted,
      weight,
      muBefore: row.mu,
      phiBefore: row.phi,
      muAfter: step.mu,
      phiAfter: step.phi,
      levelBandBefore: row.levelBand,
      createdAt: args.now,
    });
    settled.push(userId);
  }
  return settled;
}

/**
 * Takes a Match's Level check back off each player's Rating and deletes its
 * results; the answers stay for when the Match completes again. A Rating
 * nothing has touched since goes back exactly. One that a Rated Match, a
 * Place award or another Level check has moved since keeps that move: only
 * what the check added to μ comes off. A Level override set since is the
 * player's baseline, so their Rating stays as it is.
 */
export async function takeBackLevelChecks(
  database: DbClient,
  matchId: string,
  now: Date,
): Promise<void> {
  const results = await database
    .select()
    .from(levelCheckResults)
    .where(eq(levelCheckResults.matchId, matchId))
    .orderBy(levelCheckResults.userId);
  if (results.length === 0) {
    return;
  }
  const rows = await database
    .select()
    .from(ratings)
    .where(
      and(
        inArray(
          ratings.userId,
          results.map((result) => result.userId),
        ),
        eq(ratings.sport, PADEL),
      ),
    )
    .orderBy(ratings.userId)
    .for("update");
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));

  for (const result of results) {
    const row = rowByUser.get(result.userId);
    if (!row) {
      continue;
    }
    const overriddenSince = await database.query.levelOverrides.findFirst({
      where: and(
        eq(levelOverrides.userId, result.userId),
        eq(levelOverrides.sport, result.sport),
        gt(levelOverrides.createdAt, result.createdAt),
      ),
      columns: { id: true },
    });
    if (overriddenSince) {
      continue;
    }
    const untouched = row.mu === result.muAfter && row.phi === result.phiAfter;
    await database
      .update(ratings)
      .set(
        untouched
          ? {
              mu: result.muBefore,
              phi: result.phiBefore,
              levelBand: result.levelBandBefore,
              updatedAt: now,
            }
          : { ...withoutMuMove(row, result), updatedAt: now },
      )
      .where(eq(ratings.id, row.id));
  }
  await database
    .delete(levelCheckResults)
    .where(eq(levelCheckResults.matchId, matchId));
}
