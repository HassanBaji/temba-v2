import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import {
  MatchStatusEnum,
  games,
  groupTierEvents,
  groups,
  matchRatingWindows,
  matchSets,
  matches,
  performanceRatingResults,
  performanceRatings,
} from "@repo/db";

import { matchOutcome } from "@repo/domain/match-outcome";
import {
  fromHundredths,
  gameAverageRating,
  performanceScores,
  raterWeight,
  ratingWindowClosesAt,
  ratingWindowState,
  settlePerformanceRatings,
  toHundredths,
  usualRating,
  USUAL_RECENT_GAMES,
} from "@repo/domain/performance-rating";

import { type db } from "#src/db";
import { gameAdminUserIds, type GameRow } from "#src/games/access";
import { matchSeatedUserIds } from "#src/games/match-result-confirmations";
import { enqueueAt, removeJob } from "#src/jobs/enqueue";
import {
  ratingWindowSettleJob,
  ratingWindowSettleJobKey,
} from "#src/jobs/specs";
import { notify } from "#src/notifications/notify";
import {
  applyTierMatch,
  sideUserIds,
  type TierPerformance,
} from "#src/ratings/apply-tier-match";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type MatchRatingWindow = typeof matchRatingWindows.$inferSelect;

/**
 * Opens the Rating window of a football Match completing on a tier Group
 * whose Rating settings are not Off (ADR-0068), instead of writing its Tier
 * points move: the move waits for the window to settle. The window snapshots
 * the settings, so a later change applies from the next Game. A window a
 * wrong-score report suspended reopens for a fresh 24 hours with its
 * snapshot and its ballots. The Organizers, or when everyone rates every
 * seated account holder, are asked to rate. Returns whether the Match has a
 * window.
 */
export async function openRatingWindow(
  database: DbClient,
  args: {
    game: Pick<GameRow, "id" | "groupId" | "createdBy" | "challengeId">;
    matchId: string;
    now: Date;
  },
): Promise<boolean> {
  if (!args.game.groupId) {
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
  } else {
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
 * Settles a Rating window: writes each rated player's result, then the Tier
 * points move with its performance part. In Organizer mode the Organizers who
 * rated move on the result alone, and only an Organizer's ballots count. A
 * player nobody rated, or with fewer ballots than the mode needs, moves on
 * the result alone. Idempotent on `settled_at`; a suspended window waits for
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
    columns: { id: true, groupId: true, createdBy: true, challengeId: true },
  });
  if (!game?.groupId) {
    return false;
  }
  const mode = window.mode;

  const seated = new Set([
    ...(await sideUserIds(database, match.slot1GameTeamId)),
    ...(await sideUserIds(database, match.slot2GameTeamId)),
  ]);
  const organizerIds = new Set(await gameAdminUserIds(database, game));
  const ballots = (
    await database
      .select({
        raterUserId: performanceRatings.raterUserId,
        rateeUserId: performanceRatings.rateeUserId,
        value: performanceRatings.value,
      })
      .from(performanceRatings)
      .where(eq(performanceRatings.matchId, matchId))
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
  const settled = settlePerformanceRatings(ballots, weights, { mode }).filter(
    (row) => mode === "everyone" || !raters.has(row.userId),
  );
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
    const past = await pastGroupRatings(database, {
      groupId: game.groupId,
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
  if (outcome.result !== "none") {
    await applyTierMatch(database, {
      groupId: game.groupId,
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
  return true;
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
