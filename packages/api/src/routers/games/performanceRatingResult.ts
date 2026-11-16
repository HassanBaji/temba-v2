import { TRPCError } from "@trpc/server";
import { and, count, eq, lte } from "drizzle-orm";
import { z } from "zod";

import {
  GroupSportEnum,
  groupTierEvents,
  groups,
  levelCheckResults,
  matchRatingWindows,
  performanceRatingResults,
  performanceRatings,
  ratings,
} from "@repo/db";

import { DEFAULT_FOOTBALL_BIBS } from "@repo/domain/football-lineup";
import {
  LEVEL_CHECK_MIN_BALLOTS,
  levelCheckVerdict,
  type LevelCheckResultData,
} from "@repo/domain/level-check";
import { gameMvpView } from "@repo/domain/marks";
import {
  TRIM_FROM_BALLOTS,
  minBallotsFor,
  ratingWindowState,
  type NoPerformanceReason,
  type PerformanceRatingResultData,
} from "@repo/domain/performance-rating";
import { TIER_PROVISIONAL_GAMES } from "@repo/domain/tier-points";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, gameAdminUserIds, requireGame } from "#src/games/access";
import {
  footballMatch,
  footballScoreOf,
  footballScoreSet,
} from "#src/games/football-lineup";
import { matchSeatedUserIds } from "#src/games/match-result-confirmations";
import { loadMatchParticipants } from "#src/marks/match-participants";
import { mvpQuestion } from "#src/marks/settle-mvp";
import { loadGroupTierTable } from "#src/ratings/group-tier-table";
import { levelCheckAsked, levelCheckPicks } from "#src/ratings/level-check";
import {
  countedBallots,
  settleRatingWindowIfDue,
} from "#src/ratings/settle-rating-window";

type DbClient = typeof db;

/**
 * The caller's own result once a football Match's Rating window has
 * settled: their rating, how many ratings it came from and the game's
 * average, the result part and the performance part of their Tier points
 * move, the new points, place and fish, and the MVP. Before the window
 * settles it returns the closing time and no rating. A viewer who did not
 * play gets no result. A window past its close is settled first. On a Match
 * that counts for Temba Level, padel included, a player gets what they were
 * rated and where it left their Reliability instead (ADR-0095), and on padel
 * their own Level check: the verdict and the move, or why none settled.
 */
export async function performanceRatingResult(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
  now: Date = new Date(),
): Promise<PerformanceRatingResultData> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  const match =
    game.format === "friendly_game"
      ? await footballMatch(database, game.id)
      : null;
  if (match) {
    await settleRatingWindowIfDue(database, match.id, now);
  }
  const window = match
    ? await database.query.matchRatingWindows.findFirst({
        where: eq(matchRatingWindows.matchId, match.id),
      })
    : undefined;
  if (!match || !window || window.mode === "off") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: messagesFor(locale).rating.performance.errors.noWindow,
    });
  }

  const windowState = ratingWindowState(window, now);
  const state: PerformanceRatingResultData["state"] =
    windowState === "settled" || windowState === "suspended"
      ? windowState
      : "open";
  const played = (await matchSeatedUserIds(database, match)).includes(
    args.userId,
  );
  const pending = {
    state,
    mode: window.mode,
    closesAt: window.closesAt,
    played,
    sport: game.sport,
    countsForLevel: window.countsForLevel,
    reliability:
      state === "settled" && played && window.countsForLevel
        ? await reliabilityResult(database, {
            match,
            game,
            window,
            userId: args.userId,
          })
        : null,
    levelCheck:
      state === "settled" && played && levelCheckAsked(window, game.sport)
        ? await levelCheckResult(database, { match, userId: args.userId })
        : null,
    result: null,
  };
  if (state !== "settled" || !played || !game.groupId) {
    return pending;
  }

  const event = await database.query.groupTierEvents.findFirst({
    where: and(
      eq(groupTierEvents.matchId, match.id),
      eq(groupTierEvents.userId, args.userId),
      eq(groupTierEvents.kind, "game"),
    ),
  });
  const participants = await loadMatchParticipants(database, match, game);
  const viewer = participants.find((row) => row.userId === args.userId);
  if (!event || !viewer) {
    return pending;
  }

  const results = await database.query.performanceRatingResults.findMany({
    where: eq(performanceRatingResults.matchId, match.id),
  });
  const own = results.find((row) => row.userId === args.userId);
  const ratingByUser = new Map(
    results.map((row) => [row.userId, row.ratingHundredths]),
  );

  const organizerIds = new Set(await gameAdminUserIds(database, game));
  const received = (
    await countedBallots(database, { match, game, window })
  ).ballots.filter((ballot) => ballot.rateeUserId === args.userId);

  let noRating: {
    reason: NoPerformanceReason;
    ballotsReceived: number;
  } | null = null;
  if (event.ratingHundredths == null) {
    let reason: NoPerformanceReason = "too_few_ballots";
    if (window.mode === "organizer") {
      const [rated] = await database
        .select({ ballots: count() })
        .from(performanceRatings)
        .where(
          and(
            eq(performanceRatings.matchId, match.id),
            eq(performanceRatings.raterUserId, args.userId),
          ),
        );
      reason =
        organizerIds.has(args.userId) && (rated?.ballots ?? 0) > 0
          ? "organizer_rated"
          : "organizer_did_not_rate";
    }
    noRating = { reason, ballotsReceived: received.length };
  }

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, game.groupId),
    columns: { name: true },
  });

  const placeAfter = event.placeAfter;
  const [gamesSoFar] =
    placeAfter == null
      ? await database
          .select({ games: count() })
          .from(groupTierEvents)
          .where(
            and(
              eq(groupTierEvents.groupId, event.groupId),
              eq(groupTierEvents.userId, args.userId),
              eq(groupTierEvents.kind, "game"),
              lte(groupTierEvents.createdAt, event.createdAt),
            ),
          )
      : [];

  // "N points to the next band" is about today, so it is said only while the
  // player still holds the points and the fish this Match gave them.
  const today = (
    await loadGroupTierTable(database, event.groupId)
  ).table.rows.find((row) => row.userId === args.userId);
  const stillHeld =
    today?.points === event.pointsAfter && today.band === event.bandAfter;

  const mvp = gameMvpView({
    question: await mvpQuestion(database, {
      game,
      match,
      participants,
      now,
    }),
    stored: {
      userId: game.mvpUserId,
      decidedBy: game.mvpDecidedBy,
      decidedAt: game.mvpDecidedAt,
      settledAt: game.mvpSettledAt,
    },
    viewerUserId: args.userId,
    isOrganizer: organizerIds.has(args.userId),
  }).mvp;
  const mvpPlayer =
    mvp.state === "decided" && mvp.userId && mvp.decidedBy
      ? participants.find((row) => row.userId === mvp.userId)
      : undefined;

  const score = footballScoreOf(await footballScoreSet(database, match.id));
  const bibOf = (slot: 1 | 2) =>
    participants.find((row) => row.slot === slot)?.bib ??
    (slot === 1 ? DEFAULT_FOOTBALL_BIBS.slot1 : DEFAULT_FOOTBALL_BIBS.slot2);

  return {
    ...pending,
    result: {
      groupName: group?.name ?? null,
      windowStart: game.windowStart,
      score,
      bibs: { slot1: bibOf(1), slot2: bibOf(2) },
      viewerSide: viewer.slot,
      weightPercent: window.weightPercent,
      rating:
        event.ratingHundredths != null && own
          ? {
              hundredths: event.ratingHundredths,
              usualHundredths: event.usualHundredths,
              ballotsReceived: received.length,
              trimmed: received.length >= TRIM_FROM_BALLOTS,
              organizerCountedDouble:
                window.mode === "everyone" &&
                window.organizerCountsDouble &&
                received.some((ballot) => organizerIds.has(ballot.raterUserId)),
              gameAverageHundredths: own.gameAverageHundredths,
            }
          : null,
      noRating,
      resultDelta: event.resultDelta,
      performanceDelta: event.performanceDelta,
      delta: event.delta,
      pointsBefore: event.pointsBefore,
      pointsAfter: event.pointsAfter,
      expectedScore: event.expectedScore,
      tier: {
        bandBefore: event.bandBefore,
        bandAfter: event.bandAfter,
        placeBefore: event.placeBefore,
        placeAfter,
        rankedCount: event.rankedCount,
        memberCount: event.memberCount,
        gamesOfFive: Math.min(gamesSoFar?.games ?? 0, TIER_PROVISIONAL_GAMES),
        nextBand: stillHeld ? today.nextBand : null,
        pointsToNextBand: stillHeld ? today.pointsToNextBand : null,
      },
      mvp:
        mvpPlayer && mvp.decidedBy
          ? {
              name: mvpPlayer.name,
              isViewer: mvpPlayer.userId === args.userId,
              decidedBy: mvp.decidedBy,
              votes:
                mvp.decidedBy === "vote"
                  ? {
                      for:
                        mvp.tally?.find((entry) => entry.userId === mvp.userId)
                          ?.votes ?? 0,
                      cast: mvp.votes.cast,
                    }
                  : null,
              ratingHundredths: ratingByUser.get(mvpPlayer.userId) ?? null,
            }
          : null,
    },
  };
}

/**
 * What a settled window did to the caller's Reliability: the two sides of the
 * step their rating made, or where it stands when too few rated them.
 */
async function reliabilityResult(
  database: DbClient,
  args: {
    match: Parameters<typeof countedBallots>[1]["match"];
    game: Parameters<typeof countedBallots>[1]["game"] & {
      sport: "padel" | "football";
    };
    window: Parameters<typeof countedBallots>[1]["window"];
    userId: string;
  },
): Promise<PerformanceRatingResultData["reliability"]> {
  const [own, rating, counted] = await Promise.all([
    database.query.performanceRatingResults.findFirst({
      where: and(
        eq(performanceRatingResults.matchId, args.match.id),
        eq(performanceRatingResults.userId, args.userId),
      ),
    }),
    database.query.ratings.findFirst({
      where: and(
        eq(ratings.userId, args.userId),
        eq(ratings.sport, args.game.sport),
      ),
      columns: { reliability: true },
    }),
    countedBallots(database, args),
  ]);
  if (!rating) {
    return null;
  }
  const moved =
    own?.reliabilityBefore != null && own.reliabilityAfter != null
      ? { before: own.reliabilityBefore, after: own.reliabilityAfter }
      : { before: rating.reliability, after: rating.reliability };
  return {
    ratingHundredths: own?.ratingHundredths ?? null,
    ballotsReceived: counted.ballots.filter(
      (ballot) => ballot.rateeUserId === args.userId,
    ).length,
    ballotsNeeded: minBallotsFor(
      args.window.mode === "organizer" ? "organizer" : "everyone",
      args.game.sport,
    ),
    ...moved,
  };
}

/**
 * The caller's own Level check on a settled padel window: what it moved, or
 * why it settled nothing. Null for a player with no padel Rating.
 */
async function levelCheckResult(
  database: DbClient,
  args: {
    match: Parameters<typeof levelCheckPicks>[1];
    userId: string;
  },
): Promise<LevelCheckResultData | null> {
  const own = await database.query.levelCheckResults.findFirst({
    where: and(
      eq(levelCheckResults.matchId, args.match.id),
      eq(levelCheckResults.userId, args.userId),
    ),
  });
  if (own) {
    return {
      kind: "checked",
      agreed: own.agreed,
      verdictLevelHundredths: own.verdictLevelHundredths,
      muBefore: own.muBefore,
      muAfter: own.muAfter,
      ballotsCounted: own.ballotsCounted,
    };
  }
  const rating = await database.query.ratings.findFirst({
    where: and(
      eq(ratings.userId, args.userId),
      eq(ratings.sport, GroupSportEnum.PADEL),
    ),
    columns: { id: true },
  });
  if (!rating) {
    return null;
  }
  const picks = (await levelCheckPicks(database, args.match)).get(args.userId);
  const verdict = levelCheckVerdict(picks ?? []);
  return verdict.kind === "verdict"
    ? null
    : {
        kind: "unsettled",
        reason: verdict.kind,
        ballotsReceived: verdict.ballotsCounted,
        ballotsNeeded: LEVEL_CHECK_MIN_BALLOTS,
      };
}

export const performanceRatingResultProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return performanceRatingResult(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
