import { TRPCError } from "@trpc/server";
import { and, count, eq, lte } from "drizzle-orm";
import { z } from "zod";

import {
  groupTierEvents,
  groups,
  matchRatingWindows,
  performanceRatingResults,
  performanceRatings,
} from "@repo/db";

import { DEFAULT_FOOTBALL_BIBS } from "@repo/domain/football-lineup";
import { gameMvpView } from "@repo/domain/marks";
import {
  TRIM_FROM_BALLOTS,
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
  assertFootballGame,
  footballMatch,
  footballScoreOf,
  footballScoreSet,
} from "#src/games/football-lineup";
import { matchSeatedUserIds } from "#src/games/match-result-confirmations";
import { loadMatchParticipants } from "#src/marks/match-participants";
import { mvpQuestion } from "#src/marks/settle-mvp";
import { loadGroupTierTable } from "#src/ratings/group-tier-table";
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
 * play gets no result. A window past its close is settled first.
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
  assertFootballGame(game, locale);

  const match = await footballMatch(database, game.id);
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
    countsForLevel: window.countsForLevel,
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
