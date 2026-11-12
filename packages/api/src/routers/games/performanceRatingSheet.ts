import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  gamePlayers,
  groups,
  matchRatingWindows,
  performanceRatings,
  venues,
} from "@repo/db";

import { type FootballPosition } from "@repo/domain/football-lineup";
import { marksWindow } from "@repo/domain/marks";
import {
  ratingWindowState,
  type RateGameSheet,
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
import { loadMatchParticipants } from "#src/marks/match-participants";
import { settleRatingWindowIfDue } from "#src/ratings/settle-rating-window";

type DbClient = typeof db;

/**
 * What the viewer rates on a football Match with a Rating window (screen 4a):
 * the players of both sides, the viewer's own ballots and whether the star
 * may pick the MVP. In Organizer mode only an Organizer of the Game reads it;
 * when everyone rates, a seated player. Nobody else's ballots are sent. A
 * window past its close is settled first.
 */
export async function performanceRatingSheet(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
  now: Date = new Date(),
) {
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
      message: errors.noWindow,
    });
  }

  const organizer = await isGameOrganizer(database, game, args.userId);
  const participants = await loadMatchParticipants(database, match, game);
  const viewer = participants.find((row) => row.userId === args.userId);
  if (window.mode === "organizer" && !organizer) {
    throw new TRPCError({ code: "FORBIDDEN", message: errors.organizerOnly });
  }
  if (window.mode === "everyone" && !viewer) {
    throw new TRPCError({ code: "FORBIDDEN", message: errors.seatedOnly });
  }

  const seats = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, game.id),
    columns: { userId: true, footballPosition: true },
  });
  const positionByUser = new Map<string, FootballPosition | null>(
    seats.flatMap((seat) =>
      seat.userId ? [[seat.userId, seat.footballPosition]] : [],
    ),
  );
  const ballots = await database
    .select({
      rateeUserId: performanceRatings.rateeUserId,
      value: performanceRatings.value,
    })
    .from(performanceRatings)
    .where(
      and(
        eq(performanceRatings.matchId, match.id),
        eq(performanceRatings.raterUserId, args.userId),
      ),
    );
  const group = game.groupId
    ? await database.query.groups.findFirst({
        where: eq(groups.id, game.groupId),
        columns: { name: true },
      })
    : undefined;
  const venue = game.venueId
    ? await database.query.venues.findFirst({
        where: eq(venues.id, game.venueId),
        columns: { name: true },
      })
    : undefined;
  const score = footballScoreOf(await footballScoreSet(database, match.id));
  const state = ratingWindowState(window, now);

  const player = (row: (typeof participants)[number]) => ({
    userId: row.userId,
    name: row.name,
    image: row.image,
    role: row.keeper ? ("keeper" as const) : ("outfield" as const),
    position: positionByUser.get(row.userId) ?? null,
    isViewer: row.userId === args.userId,
  });
  const slot1 = participants.filter((row) => row.slot === 1);
  const slot2 = participants.filter((row) => row.slot === 2);

  const sheet = {
    gameId: game.id,
    matchId: match.id,
    mode: window.mode,
    weightPercent: window.weightPercent,
    state: state === "open" || state === "suspended" ? state : "settled",
    closesAt: window.closesAt,
    groupName: group?.name ?? null,
    venueName: venue?.name ?? null,
    windowStart: game.windowStart,
    score,
    bibs: {
      slot1: slot1[0]?.bib ?? "black",
      slot2: slot2[0]?.bib ?? "white",
    },
    viewerSide: viewer?.slot ?? null,
    viewerIsOrganizer: organizer,
    slot1: slot1.map(player),
    slot2: slot2.map(player),
    ratings: ballots.map((row) => ({
      userId: row.rateeUserId,
      value: row.value,
    })),
    mvp: {
      pickable:
        organizer &&
        game.mvpMode === "organizer" &&
        game.mvpSettledAt === null &&
        marksWindow(match.completedAt, now)?.state === "open",
      userId: game.mvpUserId,
    },
  } satisfies RateGameSheet & Record<string, unknown>;
  return sheet;
}

export const performanceRatingSheetProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return performanceRatingSheet(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
