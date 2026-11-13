import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  groupTierEvents,
  groups,
  matchRatingWindows,
  performanceRatingResults,
} from "@repo/db";

import { DEFAULT_FOOTBALL_BIBS } from "@repo/domain/football-lineup";
import { gameMvpView } from "@repo/domain/marks";
import {
  outlierRaterIds,
  ratingWindowState,
  type PerformanceRatingSummaryData,
  type PerformanceRatingSummaryPlayer,
} from "@repo/domain/performance-rating";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, isGameOrganizer, requireGame } from "#src/games/access";
import {
  assertFootballGame,
  footballMatch,
  footballScoreOf,
  footballScoreSet,
} from "#src/games/football-lineup";
import { matchSeatedUserIds } from "#src/games/match-result-confirmations";
import { loadMatchParticipants } from "#src/marks/match-participants";
import { mvpQuestion } from "#src/marks/settle-mvp";
import {
  countedBallots,
  previousRaterDistances,
  settleRatingWindowIfDue,
} from "#src/ratings/settle-rating-window";

type DbClient = typeof db;

/**
 * The Organizer's summary once a football Match's Rating window has
 * settled: each player's rating and Tier points move, who changed tier,
 * how many rated, and how many raters counted for less. Only an Organizer of
 * the Game reads it. It never says who gave what, nor which rater counted for
 * less: no rater id leaves this file. A window past its close is settled
 * first.
 */
export async function performanceRatingSummary(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
  now: Date = new Date(),
): Promise<PerformanceRatingSummaryData> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).rating.performance.errors;
  const game = await requireGame(database, args.gameId, locale);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  assertFootballGame(game, locale);
  if (!(await isGameOrganizer(database, game, args.userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: errors.summaryOrganizerOnly,
    });
  }

  const match = await footballMatch(database, game.id);
  if (match) {
    await settleRatingWindowIfDue(database, match.id, now);
  }
  const window = match
    ? await database.query.matchRatingWindows.findFirst({
        where: eq(matchRatingWindows.matchId, match.id),
      })
    : undefined;
  if (!match || !window || window.mode === "off" || !game.groupId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: errors.noWindow,
    });
  }

  const windowState = ratingWindowState(window, now);
  const state: PerformanceRatingSummaryData["state"] =
    windowState === "settled" || windowState === "suspended"
      ? windowState
      : "open";
  const pending = {
    state,
    mode: window.mode,
    closesAt: window.closesAt,
    summary: null,
  };
  if (state !== "settled" || !window.settledAt) {
    return pending;
  }

  const participants = await loadMatchParticipants(database, match, game);
  const { ballots, weights, raters } = await countedBallots(database, {
    match,
    game,
    window,
  });
  const outliers = outlierRaterIds(ballots, weights, {
    mode: window.mode,
    previousDistances: await previousRaterDistances(database, {
      match,
      raterUserIds: [...raters],
      settledBefore: window.settledAt,
    }),
  });
  const received = new Map<string, number>();
  for (const ballot of ballots) {
    received.set(
      ballot.rateeUserId,
      (received.get(ballot.rateeUserId) ?? 0) + 1,
    );
  }

  const results = await database.query.performanceRatingResults.findMany({
    where: eq(performanceRatingResults.matchId, match.id),
  });
  const ratingByUser = new Map(
    results.map((row) => [row.userId, row.ratingHundredths]),
  );
  const events = await database.query.groupTierEvents.findMany({
    where: and(
      eq(groupTierEvents.matchId, match.id),
      eq(groupTierEvents.kind, "game"),
    ),
  });
  const eventByUser = new Map(events.map((event) => [event.userId, event]));

  const mvp = gameMvpView({
    question: await mvpQuestion(database, { game, match, participants, now }),
    stored: {
      userId: game.mvpUserId,
      decidedBy: game.mvpDecidedBy,
      decidedAt: game.mvpDecidedAt,
      settledAt: game.mvpSettledAt,
    },
    viewerUserId: args.userId,
    isOrganizer: true,
  }).mvp;
  const mvpUserId = mvp.state === "decided" ? mvp.userId : null;

  const accountHolderIds = await matchSeatedUserIds(database, match);

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, game.groupId),
    columns: { id: true, name: true },
  });
  const score = footballScoreOf(await footballScoreSet(database, match.id));
  const bibOf = (slot: 1 | 2) =>
    participants.find((row) => row.slot === slot)?.bib ??
    (slot === 1 ? DEFAULT_FOOTBALL_BIBS.slot1 : DEFAULT_FOOTBALL_BIBS.slot2);

  const player = (
    row: (typeof participants)[number],
  ): PerformanceRatingSummaryPlayer => {
    const event = eventByUser.get(row.userId);
    return {
      name: row.name,
      isViewer: row.userId === args.userId,
      ratingHundredths: ratingByUser.get(row.userId) ?? null,
      ballotsReceived: received.get(row.userId) ?? 0,
      delta: event?.delta ?? null,
      bandBefore: event?.bandBefore ?? null,
      bandAfter: event?.bandAfter ?? null,
      isMvp: row.userId === mvpUserId,
    };
  };

  return {
    ...pending,
    summary: {
      groupId: game.groupId,
      groupName: group?.name ?? null,
      closedAt: window.settledAt,
      score,
      bibs: { slot1: bibOf(1), slot2: bibOf(2) },
      viewerSide:
        participants.find((row) => row.userId === args.userId)?.slot ?? null,
      progress: { raters: raters.size, players: accountHolderIds.length },
      slot1: participants.filter((row) => row.slot === 1).map(player),
      slot2: participants.filter((row) => row.slot === 2).map(player),
      ratersCountedForLess: outliers.size,
    },
  };
}

export const performanceRatingSummaryProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return performanceRatingSummary(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
