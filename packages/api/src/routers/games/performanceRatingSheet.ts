import { TRPCError } from "@trpc/server";
import { and, countDistinct, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  GroupSportEnum,
  gamePlayers,
  groups,
  levelCheckBallots,
  matchRatingWindows,
  matchSets,
  performanceRatings,
  ratings,
  venues,
} from "@repo/db";

import {
  DEFAULT_FOOTBALL_BIBS,
  type FootballPosition,
} from "@repo/domain/football-lineup";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import type { LevelCheckSheet } from "@repo/domain/level-check";
import { marksWindow } from "@repo/domain/marks";
import { matchOutcome } from "@repo/domain/match-outcome";
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
  footballMatch,
  footballScoreOf,
  footballScoreSet,
} from "#src/games/football-lineup";
import { matchSeatedUserIds } from "#src/games/match-result-confirmations";
import {
  loadMatchParticipants,
  type MatchParticipant,
} from "#src/marks/match-participants";
import { levelCheckAsked } from "#src/ratings/level-check";
import { settleRatingWindowIfDue } from "#src/ratings/settle-rating-window";

type DbClient = typeof db;

/**
 * What the viewer rates on a Friendly game's Match with a Rating window: the
 * players of both sides, the viewer's own ballots, how many of
 * the seated account holders have rated and, in Organizer mode, whether the
 * star may pick the MVP. In Organizer mode only an Organizer of the Game
 * reads it; when everyone rates, a seated player. Nobody else's ballots are
 * sent, and the count never says who rated what. A window past its close is
 * settled first. A padel Match's score is the Sets each side won. A padel
 * Match that asks the Level check also sends each other player's shown band
 * and the viewer's own answers, never anyone else's.
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
  const accountHolderIds = await matchSeatedUserIds(database, match);
  const seatedIds = participants.map((row) => row.userId);
  const [raterCount] =
    accountHolderIds.length > 0 && seatedIds.length > 0
      ? await database
          .select({ raters: countDistinct(performanceRatings.raterUserId) })
          .from(performanceRatings)
          .where(
            and(
              eq(performanceRatings.matchId, match.id),
              inArray(performanceRatings.raterUserId, accountHolderIds),
              inArray(performanceRatings.rateeUserId, seatedIds),
            ),
          )
      : [];
  const score =
    game.sport === "padel"
      ? await padelSetWins(database, match.id)
      : footballScoreOf(await footballScoreSet(database, match.id));
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
    sport: game.sport,
    mode: window.mode,
    weightPercent: window.weightPercent,
    state: state === "open" || state === "suspended" ? state : "settled",
    closesAt: window.closesAt,
    groupName: group?.name ?? null,
    venueName: venue?.name ?? null,
    windowStart: game.windowStart,
    score,
    bibs: {
      slot1: slot1[0]?.bib ?? DEFAULT_FOOTBALL_BIBS.slot1,
      slot2: slot2[0]?.bib ?? DEFAULT_FOOTBALL_BIBS.slot2,
    },
    viewerSide: viewer?.slot ?? null,
    viewerIsOrganizer: organizer,
    slot1: slot1.map(player),
    slot2: slot2.map(player),
    ratings: ballots.map((row) => ({
      userId: row.rateeUserId,
      value: row.value,
    })),
    progress: {
      raters: raterCount?.raters ?? 0,
      players: accountHolderIds.length,
    },
    mvp: {
      pickable:
        window.mode === "organizer" &&
        organizer &&
        game.mvpMode === "organizer" &&
        game.mvpSettledAt === null &&
        marksWindow(match.completedAt, now)?.state === "open",
      userId: game.mvpUserId,
    },
    levelCheck:
      viewer && levelCheckAsked(window, game.sport)
        ? await levelCheckSheet(database, {
            matchId: match.id,
            viewerUserId: args.userId,
            participants,
          })
        : null,
  } satisfies RateGameSheet & Record<string, unknown>;
  return sheet;
}

/** The other players the viewer may answer about, with the band each shows, and the viewer's own answers. */
async function levelCheckSheet(
  database: DbClient,
  args: {
    matchId: string;
    viewerUserId: string;
    participants: readonly MatchParticipant[];
  },
): Promise<LevelCheckSheet> {
  const others = args.participants.filter(
    (row) => row.userId !== args.viewerUserId,
  );
  const [shown, answers] = await Promise.all([
    others.length === 0
      ? []
      : database
          .select({ userId: ratings.userId, levelBand: ratings.levelBand })
          .from(ratings)
          .where(
            and(
              inArray(
                ratings.userId,
                others.map((row) => row.userId),
              ),
              eq(ratings.sport, GroupSportEnum.PADEL),
            ),
          ),
    database
      .select({
        rateeUserId: levelCheckBallots.rateeUserId,
        band: levelCheckBallots.band,
      })
      .from(levelCheckBallots)
      .where(
        and(
          eq(levelCheckBallots.matchId, args.matchId),
          eq(levelCheckBallots.raterUserId, args.viewerUserId),
        ),
      ),
  ]);
  const bandOf = new Map(shown.map((row) => [row.userId, row.levelBand]));
  return {
    players: others.flatMap((row) => {
      const band = bandOf.get(row.userId);
      return band
        ? [
            {
              userId: row.userId,
              name: row.name,
              shownBand: displayLabelFromStoredBand(band),
            },
          ]
        : [];
    }),
    answers: answers.map((row) => ({
      userId: row.rateeUserId,
      band: displayLabelFromStoredBand(row.band),
    })),
  };
}

async function padelSetWins(database: DbClient, matchId: string) {
  const outcome = matchOutcome(
    await database.query.matchSets.findMany({
      where: eq(matchSets.matchId, matchId),
      columns: { slot1GamesWon: true, slot2GamesWon: true },
    }),
  );
  return outcome.result === "none"
    ? null
    : { slot1: outcome.slot1SetWins, slot2: outcome.slot2SetWins };
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
