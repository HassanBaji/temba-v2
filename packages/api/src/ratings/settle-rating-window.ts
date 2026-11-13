import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  lt,
  lte,
  ne,
  sql,
} from "drizzle-orm";

import {
  MatchStatusEnum,
  gamePlayers,
  games,
  groupTierEvents,
  groups,
  matchGoals,
  matchRatingWindows,
  matchSets,
  matches,
  performanceRatingResults,
  performanceRatings,
  ratingEvents,
} from "@repo/db";

import { footballGoalsRole, OVR_PART_WEIGHTS } from "@repo/domain/football-ovr";
import { gameRates } from "@repo/domain/game-rating-eligibility";
import { matchOutcome } from "@repo/domain/match-outcome";
import {
  fromHundredths,
  gameAverageRating,
  performanceScores,
  raterWeight,
  ratingWindowClosesAt,
  ratingWindowState,
  raterDistances,
  settlePerformanceRatings,
  toHundredths,
  usualRating,
  OUTLIER_GAMES_RUNNING,
  USUAL_RECENT_GAMES,
  type PerformanceBallot,
  type PreviousRaterDistances,
} from "@repo/domain/performance-rating";

import { type db } from "#src/db";
import { gameAdminUserIds, type GameRow } from "#src/games/access";
import { footballScoreOf } from "#src/games/football-lineup";
import { matchSeatedUserIds } from "#src/games/match-result-confirmations";
import { enqueueAt, removeJob } from "#src/jobs/enqueue";
import {
  ratingWindowSettleJob,
  ratingWindowSettleJobKey,
} from "#src/jobs/specs";
import { settleMvp, votedMvpUserId } from "#src/marks/settle-mvp";
import { notify } from "#src/notifications/notify";
import { applyFootballLevelMatch } from "#src/ratings/apply-football-level-match";
import {
  applyTierMatch,
  sideUserIds,
  type TierPerformance,
} from "#src/ratings/apply-tier-match";
import { ratingWeightForGame } from "#src/ratings/game-rating-weight";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type MatchRatingWindow = typeof matchRatingWindows.$inferSelect;

/**
 * Opens the Rating window of a football Match completing on a tier Group
 * whose Rating settings are not Off (ADR-0068), instead of writing its Tier
 * points move: the move waits for the window to settle. The window snapshots
 * the settings, so a later change applies from the next Game. A Match that
 * counts for Temba Level always opens one, in Everyone mode at OVR's fixed
 * weight, and its OVR move waits for it (ADR-0069). A window a wrong-score
 * report suspended reopens for a fresh 24 hours with its snapshot and its
 * ballots. The Organizers, or when everyone rates every seated account
 * holder, are asked to rate. Returns whether the Match has a window.
 */
export async function openRatingWindow(
  database: DbClient,
  args: {
    game: Pick<GameRow, "id" | "groupId" | "createdBy" | "challengeId">;
    matchId: string;
    now: Date;
    countsForLevel?: boolean;
  },
): Promise<boolean> {
  const countsForLevel = args.countsForLevel ?? false;
  if (!args.game.groupId && !countsForLevel) {
    return false;
  }
  const closesAt = ratingWindowClosesAt(args.now);
  const [existing] = await database
    .select()
    .from(matchRatingWindows)
    .where(eq(matchRatingWindows.matchId, args.matchId))
    .for("update");

  let window: MatchRatingWindow | undefined;
  if (existing) {
    [window] = await database
      .update(matchRatingWindows)
      .set({
        closesAt,
        settledAt: null,
        suspendedAt: null,
        updatedAt: args.now,
      })
      .where(eq(matchRatingWindows.matchId, args.matchId))
      .returning();
  } else if (countsForLevel) {
    [window] = await database
      .insert(matchRatingWindows)
      .values({
        matchId: args.matchId,
        closesAt,
        mode: "everyone",
        weightPercent: Math.round(OVR_PART_WEIGHTS.performance * 100),
        organizerCountsDouble: false,
        countsForLevel: true,
        createdAt: args.now,
        updatedAt: args.now,
      })
      .returning();
  } else if (args.game.groupId) {
    const group = await database.query.groups.findFirst({
      where: eq(groups.id, args.game.groupId),
      columns: {
        performanceRatingMode: true,
        performanceWeightPercent: true,
        organizerCountsDouble: true,
      },
    });
    if (!group || group.performanceRatingMode === "off") {
      return false;
    }
    [window] = await database
      .insert(matchRatingWindows)
      .values({
        matchId: args.matchId,
        closesAt,
        mode: group.performanceRatingMode,
        weightPercent: group.performanceWeightPercent,
        organizerCountsDouble: group.organizerCountsDouble,
        countsForLevel: false,
        createdAt: args.now,
        updatedAt: args.now,
      })
      .returning();
  }
  if (!window) {
    return false;
  }

  await enqueueAt(database, ratingWindowSettleJob(args.matchId), closesAt);
  const recipients =
    window.mode === "organizer"
      ? (await gameAdminUserIds(database, args.game)).map((userId) => ({
          userId,
          audience: "admin" as const,
        }))
      : await seatedRecipients(database, args.matchId);
  await notify(database, {
    type: "performance_ratings_open",
    recipients,
    excludeUserIds: [],
    groupId: args.game.groupId,
    gameId: args.game.id,
    dedupeKey: `performance_ratings_open:${args.matchId}:${closesAt.getTime()}`,
  });
  return true;
}

/** When everyone rates, every seated account holder is asked to rate. */
async function seatedRecipients(database: DbClient, matchId: string) {
  const match = await database.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) {
    return [];
  }
  return (await matchSeatedUserIds(database, match)).map((userId) => ({
    userId,
    audience: "player" as const,
  }));
}

/** The player's last settled ratings in this Group, newest first, for their usual. */
async function pastGroupRatings(
  database: DbClient,
  args: { groupId: string; userId: string; matchId: string },
) {
  const rows = await database
    .select({ ratingHundredths: groupTierEvents.ratingHundredths })
    .from(groupTierEvents)
    .where(
      and(
        eq(groupTierEvents.groupId, args.groupId),
        eq(groupTierEvents.userId, args.userId),
        eq(groupTierEvents.kind, "game"),
        isNotNull(groupTierEvents.ratingHundredths),
        sql`${groupTierEvents.matchId} is distinct from ${args.matchId}`,
      ),
    )
    .orderBy(desc(groupTierEvents.createdAt))
    .limit(USUAL_RECENT_GAMES);
  return rows.flatMap((row) =>
    row.ratingHundredths == null ? [] : [fromHundredths(row.ratingHundredths)],
  );
}

/**
 * The player's last settled ratings on Matches that counted for Temba Level,
 * newest first, for their usual on OVR's ratings part.
 */
async function pastLevelRatings(
  database: DbClient,
  args: { userId: string; matchId: string },
) {
  const rows = await database
    .select({ ratingHundredths: performanceRatingResults.ratingHundredths })
    .from(performanceRatingResults)
    .innerJoin(
      matchRatingWindows,
      eq(matchRatingWindows.matchId, performanceRatingResults.matchId),
    )
    .where(
      and(
        eq(performanceRatingResults.userId, args.userId),
        ne(performanceRatingResults.matchId, args.matchId),
        eq(matchRatingWindows.countsForLevel, true),
        isNotNull(matchRatingWindows.settledAt),
      ),
    )
    .orderBy(desc(performanceRatingResults.createdAt))
    .limit(USUAL_RECENT_GAMES);
  return rows.map((row) => fromHundredths(row.ratingHundredths));
}

/**
 * The ballots a Rating window counts and each rater's weight: from a seated
 * player when everyone rates, from an Organizer of the Game when the
 * Organizer rates, about a seated player.
 */
export async function countedBallots(
  database: DbClient,
  args: {
    match: Pick<
      typeof matches.$inferSelect,
      "id" | "slot1GameTeamId" | "slot2GameTeamId"
    >;
    game: Pick<GameRow, "id" | "groupId" | "createdBy" | "challengeId">;
    window: Pick<MatchRatingWindow, "mode" | "organizerCountsDouble">;
  },
): Promise<{
  ballots: PerformanceBallot[];
  weights: Map<string, number>;
  raters: Set<string>;
}> {
  const { match, window } = args;
  const mode = window.mode === "organizer" ? "organizer" : "everyone";
  const seated = new Set([
    ...(match.slot1GameTeamId
      ? await sideUserIds(database, match.slot1GameTeamId)
      : []),
    ...(match.slot2GameTeamId
      ? await sideUserIds(database, match.slot2GameTeamId)
      : []),
  ]);
  const organizerIds = new Set(await gameAdminUserIds(database, args.game));
  const ballots = (
    await database
      .select({
        raterUserId: performanceRatings.raterUserId,
        rateeUserId: performanceRatings.rateeUserId,
        value: performanceRatings.value,
      })
      .from(performanceRatings)
      .where(eq(performanceRatings.matchId, match.id))
  ).filter(
    (ballot) =>
      seated.has(ballot.rateeUserId) &&
      (mode === "everyone"
        ? seated.has(ballot.raterUserId)
        : organizerIds.has(ballot.raterUserId)),
  );
  const raters = new Set(ballots.map((ballot) => ballot.raterUserId));
  const weights = new Map(
    [...raters].map((raterUserId) => [
      raterUserId,
      raterWeight({
        mode,
        organizerCountsDouble: window.organizerCountsDouble,
        raterIsOrganizer: organizerIds.has(raterUserId),
      }),
    ]),
  );
  return { ballots, weights, raters };
}

/**
 * Each rater's mean distance from the settled ratings in their previous two
 * Matches before this one, newest first: Matches they rated whose window had
 * settled by `settledBefore`. Read from the stored ballots and results.
 */
export async function previousRaterDistances(
  database: DbClient,
  args: {
    match: Pick<typeof matches.$inferSelect, "id" | "completedAt">;
    raterUserIds: readonly string[];
    settledBefore: Date;
  },
): Promise<PreviousRaterDistances> {
  const distances = new Map<string, (number | null)[]>();
  for (const raterUserId of args.raterUserIds) {
    const previous = await database
      .selectDistinct({
        matchId: performanceRatings.matchId,
        completedAt: matches.completedAt,
      })
      .from(performanceRatings)
      .innerJoin(
        matchRatingWindows,
        eq(matchRatingWindows.matchId, performanceRatings.matchId),
      )
      .innerJoin(matches, eq(matches.id, performanceRatings.matchId))
      .where(
        and(
          eq(performanceRatings.raterUserId, raterUserId),
          ne(performanceRatings.matchId, args.match.id),
          lte(matchRatingWindows.settledAt, args.settledBefore),
          args.match.completedAt
            ? lt(matches.completedAt, args.match.completedAt)
            : undefined,
        ),
      )
      .orderBy(desc(matches.completedAt))
      .limit(OUTLIER_GAMES_RUNNING - 1);
    const row: (number | null)[] = [];
    for (const { matchId } of previous) {
      const ballots = await database
        .select({
          raterUserId: performanceRatings.raterUserId,
          rateeUserId: performanceRatings.rateeUserId,
          value: performanceRatings.value,
        })
        .from(performanceRatings)
        .where(
          and(
            eq(performanceRatings.matchId, matchId),
            eq(performanceRatings.raterUserId, raterUserId),
          ),
        );
      const results = await database
        .select({
          userId: performanceRatingResults.userId,
          ratingHundredths: performanceRatingResults.ratingHundredths,
        })
        .from(performanceRatingResults)
        .where(
          and(
            eq(performanceRatingResults.matchId, matchId),
            inArray(
              performanceRatingResults.userId,
              ballots.map((ballot) => ballot.rateeUserId),
            ),
          ),
        );
      row.push(
        raterDistances(
          ballots,
          results.map((result) => ({
            userId: result.userId,
            rating: fromHundredths(result.ratingHundredths),
          })),
        ).get(raterUserId) ?? null,
      );
    }
    distances.set(raterUserId, row);
  }
  return distances;
}

/**
 * The OVR move of a Match that counts for Temba Level, once its Rating window
 * settles (ADR-0069): the MVP is settled first, since it closes with the
 * window (D21), and only an MVP decided by vote moves OVR; goals come from
 * the Scorers and the Score, weighed by each player's Football role.
 */
async function applySettledLevelMatch(
  database: DbClient,
  args: {
    game: { id: string; groupId: string | null; isPublic: boolean };
    matchId: string;
    slot1GameTeamId: string;
    slot2GameTeamId: string;
    result: "slot1" | "slot2" | "draw";
    score: { slot1: number; slot2: number } | null;
    performance: ReadonlyMap<string, number>;
    now: Date;
  },
) {
  await settleMvp(database, args.game.id, args.now);
  const [mvp, goals, seats, weight] = await Promise.all([
    database.query.games.findFirst({
      where: eq(games.id, args.game.id),
      columns: { mvpUserId: true, mvpDecidedBy: true, mvpSettledAt: true },
    }),
    database.query.matchGoals.findMany({
      where: eq(matchGoals.matchId, args.matchId),
      columns: { userId: true, goals: true },
    }),
    database.query.gamePlayers.findMany({
      where: eq(gamePlayers.gameId, args.game.id),
      columns: { userId: true, footballRole: true, footballPosition: true },
    }),
    ratingWeightForGame(database, args.game),
  ]);
  await applyFootballLevelMatch(database, {
    matchId: args.matchId,
    slot1GameTeamId: args.slot1GameTeamId,
    slot2GameTeamId: args.slot2GameTeamId,
    result: args.result,
    weight,
    now: args.now,
    score: args.score,
    goals: new Map(goals.map((row) => [row.userId, row.goals])),
    goalsRoles: new Map(
      seats.flatMap((seat) =>
        seat.userId
          ? [
              [
                seat.userId,
                footballGoalsRole(seat.footballRole, seat.footballPosition),
              ] as const,
            ]
          : [],
      ),
    ),
    performance: args.performance,
    votedMvpUserId: votedMvpUserId(mvp),
  });
}

/**
 * Settles a Rating window: writes each rated player's result, then the Tier
 * points move with its performance part, or on a Match that counts for Temba
 * Level the OVR move with all four parts. In Organizer mode the Organizers
 * who rated move on the result alone, and only an Organizer's ballots count.
 * A player nobody rated, or with fewer ballots than the mode needs, has no
 * performance part. The MVP closes with the window, whichever ladder it
 * moves. Idempotent on `settled_at`; a suspended window waits for
 * the next completion. Without `force` it settles only once `closes_at` has
 * passed. Returns whether this call settled it.
 */
export async function settleRatingWindow(
  database: DbClient,
  matchId: string,
  now: Date,
  options: { force?: boolean } = {},
): Promise<boolean> {
  const [match] = await database
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .for("update");
  const [window] = await database
    .select()
    .from(matchRatingWindows)
    .where(eq(matchRatingWindows.matchId, matchId))
    .for("update");
  if (
    !match ||
    !window ||
    window.mode === "off" ||
    match.status !== MatchStatusEnum.COMPLETED ||
    !match.slot1GameTeamId ||
    !match.slot2GameTeamId
  ) {
    return false;
  }
  const state = ratingWindowState(window, now);
  if (state === "settled" || state === "suspended") {
    return false;
  }
  if (state === "open" && !options.force) {
    return false;
  }
  const game = await database.query.games.findFirst({
    where: eq(games.id, match.gameId),
    columns: {
      id: true,
      groupId: true,
      isPublic: true,
      createdBy: true,
      challengeId: true,
      rated: true,
      cancelledAt: true,
    },
  });
  if (!game || (!window.countsForLevel && !game.groupId)) {
    return false;
  }
  const groupId = game.groupId;
  const mode = window.mode;
  const { ballots, weights, raters } = await countedBallots(database, {
    match,
    game,
    window,
  });
  const previousDistances = await previousRaterDistances(database, {
    match,
    raterUserIds: [...raters],
    settledBefore: now,
  });
  const settled = settlePerformanceRatings(ballots, weights, {
    mode,
    previousDistances,
  }).filter((row) => mode === "everyone" || !raters.has(row.userId));
  const average = gameAverageRating(settled);

  await database
    .delete(performanceRatingResults)
    .where(eq(performanceRatingResults.matchId, matchId));
  if (settled.length > 0 && average !== null) {
    await database.insert(performanceRatingResults).values(
      settled.map((row) => ({
        matchId,
        userId: row.userId,
        ratingHundredths: toHundredths(row.rating),
        ballotsCounted: row.ballotsCounted,
        gameAverageHundredths: toHundredths(average),
        createdAt: now,
      })),
    );
  }

  const withUsual = [];
  for (const row of settled) {
    const past =
      window.countsForLevel || !groupId
        ? await pastLevelRatings(database, { userId: row.userId, matchId })
        : await pastGroupRatings(database, {
            groupId,
            userId: row.userId,
            matchId,
          });
    withUsual.push({ ...row, usual: usualRating(past) });
  }
  const scores = performanceScores(withUsual);
  const performance = new Map<string, TierPerformance>(
    withUsual.map((row) => [
      row.userId,
      {
        score: scores.get(row.userId) ?? 0,
        ratingHundredths: toHundredths(row.rating),
        usualHundredths: toHundredths(row.usual),
      },
    ]),
  );

  const sets = await database.query.matchSets.findMany({
    where: eq(matchSets.matchId, matchId),
    columns: { slot1GamesWon: true, slot2GamesWon: true },
  });
  const outcome = matchOutcome(sets);
  if (window.countsForLevel) {
    if (outcome.result !== "none" && gameRates(game)) {
      await applySettledLevelMatch(database, {
        game,
        matchId,
        slot1GameTeamId: match.slot1GameTeamId,
        slot2GameTeamId: match.slot2GameTeamId,
        result: outcome.result,
        score: footballScoreOf(sets[0] ?? null),
        performance: scores,
        now,
      });
    }
  } else if (outcome.result !== "none" && groupId) {
    await applyTierMatch(database, {
      groupId,
      matchId,
      slot1GameTeamId: match.slot1GameTeamId,
      slot2GameTeamId: match.slot2GameTeamId,
      result: outcome.result,
      now,
      weight: window.weightPercent / 100,
      performance,
    });
  }

  await database
    .update(matchRatingWindows)
    .set({ settledAt: now, updatedAt: now })
    .where(eq(matchRatingWindows.matchId, matchId));
  await settleMvp(database, game.id, now);
  if (window.countsForLevel) {
    await notifyLevelRatingsClosed(database, {
      match,
      gameId: game.id,
      groupId,
    });
  } else if (groupId) {
    await notifyRatingsClosed(database, { match, gameId: game.id, groupId });
  }
  return true;
}

/**
 * Tells each seated account holder their settled rating and the OVR move it
 * made on a Match that counts for Temba Level, one row per player, each
 * about their own rating event.
 */
async function notifyLevelRatingsClosed(
  database: DbClient,
  args: {
    match: typeof matches.$inferSelect;
    gameId: string;
    groupId: string | null;
  },
) {
  const accountHolders = new Set(
    await matchSeatedUserIds(database, args.match),
  );
  const events = await database
    .select({ id: ratingEvents.id, userId: ratingEvents.userId })
    .from(ratingEvents)
    .where(
      and(
        eq(ratingEvents.matchId, args.match.id),
        eq(ratingEvents.sport, "football"),
      ),
    );
  for (const event of events) {
    if (!accountHolders.has(event.userId)) {
      continue;
    }
    await notify(database, {
      type: "performance_ratings_closed",
      recipients: [{ userId: event.userId, audience: "player" }],
      excludeUserIds: [],
      groupId: args.groupId,
      gameId: args.gameId,
      dedupeKey: `performance_ratings_closed:${event.id}`,
    });
  }
}

/**
 * Tells each seated account holder their settled rating and the Tier points
 * move it made, one row per player, each about their own `game` event.
 */
async function notifyRatingsClosed(
  database: DbClient,
  args: {
    match: typeof matches.$inferSelect;
    gameId: string;
    groupId: string;
  },
) {
  const accountHolders = new Set(
    await matchSeatedUserIds(database, args.match),
  );
  const events = await database
    .select({ id: groupTierEvents.id, userId: groupTierEvents.userId })
    .from(groupTierEvents)
    .where(
      and(
        eq(groupTierEvents.matchId, args.match.id),
        eq(groupTierEvents.kind, "game"),
      ),
    );
  for (const event of events) {
    if (!accountHolders.has(event.userId)) {
      continue;
    }
    await notify(database, {
      type: "performance_ratings_closed",
      recipients: [{ userId: event.userId, audience: "player" }],
      excludeUserIds: [],
      groupId: args.groupId,
      gameId: args.gameId,
      groupTierEventId: event.id,
      dedupeKey: `performance_ratings_closed:${event.id}`,
    });
  }
}

/**
 * The read-time fallback for a late or failed Job: once the window has
 * closed, a read settles it so nobody waits on a move past the close.
 */
export async function settleRatingWindowIfDue(
  database: DbClient,
  matchId: string,
  now: Date,
): Promise<boolean> {
  const window = await database.query.matchRatingWindows.findFirst({
    where: eq(matchRatingWindows.matchId, matchId),
  });
  if (!window || ratingWindowState(window, now) !== "due") {
    return false;
  }
  return database.transaction((tx) => settleRatingWindow(tx, matchId, now));
}

/**
 * A wrong-score report suspends the window: its results go, the Job is
 * removed, and the ballots stay for when the Match completes again.
 */
export async function suspendRatingWindow(
  database: DbClient,
  matchId: string,
  now: Date,
): Promise<void> {
  const [window] = await database
    .update(matchRatingWindows)
    .set({ suspendedAt: now, settledAt: null, updatedAt: now })
    .where(eq(matchRatingWindows.matchId, matchId))
    .returning({ matchId: matchRatingWindows.matchId });
  if (!window) {
    return;
  }
  await database
    .delete(performanceRatingResults)
    .where(eq(performanceRatingResults.matchId, matchId));
  await removeJob(database, ratingWindowSettleJobKey(matchId));
}
