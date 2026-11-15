import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  GameSportEnum,
  GroupSportEnum,
  matchGoals,
  ratingEvents,
  user,
  type DbClient,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  loadCountedMatches,
  matchHistoryHidden,
  mayViewPlayer,
  mostPlayedPartners,
  openableGameIds,
  sportRating,
  streaksFrom,
  usualVenue,
  withViewerFrom,
  type CountedMatch,
} from "#src/routers/users/playerProfile";
import { matchOutcome } from "@repo/domain/match-outcome";
import { outcomeForSlot } from "@repo/domain/match-slots";
import type { FootballMatchInput } from "@repo/domain/player-profile-football";
import { LAST_TEN_SIZE } from "@repo/domain/player-profile-matches";
import type { MatchOutcome } from "@repo/domain/result-mark";
import { sportsPlayed } from "@repo/domain/sport";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

const notFound = (locale: Locale) =>
  new TRPCError({
    code: "NOT_FOUND",
    message: messagesFor(locale).profile.errors.playerNotFound,
  });

// A completed Match with no scored Score has no winner, so it reads as a draw.
function ownerOutcome(match: CountedMatch): MatchOutcome {
  return (
    outcomeForSlot(match.userSlot, matchOutcome(match.sets).result) ?? "draw"
  );
}

/** The Score is the Match's one Set, read from the owner's side. */
function ownerScore(match: CountedMatch) {
  const set = match.sets[0];
  if (set?.slot1GamesWon == null || set.slot2GamesWon == null) {
    return null;
  }
  return match.userSlot === 1
    ? { us: set.slot1GamesWon, them: set.slot2GamesWon }
    : { us: set.slot2GamesWon, them: set.slot1GamesWon };
}

async function goalsByMatch(
  database: DbClient,
  userId: string,
  matchIds: readonly string[],
) {
  const rows =
    matchIds.length === 0
      ? []
      : await database.query.matchGoals.findMany({
          where: and(
            eq(matchGoals.userId, userId),
            inArray(matchGoals.matchId, [...matchIds]),
          ),
          columns: { matchId: true, goals: true },
        });
  return new Map(rows.map((row) => [row.matchId, row.goals]));
}

/** What each Match that counted moved the owner's football Level. */
async function levelMovesByMatch(
  database: DbClient,
  userId: string,
  matchIds: readonly string[],
) {
  const events =
    matchIds.length === 0
      ? []
      : await database.query.ratingEvents.findMany({
          where: and(
            eq(ratingEvents.userId, userId),
            eq(ratingEvents.sport, GroupSportEnum.FOOTBALL),
            inArray(ratingEvents.matchId, [...matchIds]),
          ),
          columns: { matchId: true, muBefore: true, muAfter: true },
        });
  return new Map(
    events.map((event) => [
      event.matchId,
      { muBefore: event.muBefore, muAfter: event.muAfter },
    ]),
  );
}

function overallFrom(
  counted: readonly CountedMatch[],
  goals: ReadonlyMap<string, number>,
) {
  const tally = { won: 0, lost: 0, draw: 0 };
  for (const match of counted) {
    tally[ownerOutcome(match)] += 1;
  }
  return {
    played: counted.length,
    won: tally.won,
    lost: tally.lost,
    drawn: tally.draw,
    goals: [...goals.values()].reduce((total, count) => total + count, 0),
  };
}

export async function loadFootballProfile(
  database: DbClient,
  args: { viewerId: string; playerId: string; now?: Date; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  if (!(await mayViewPlayer(database, args))) {
    throw notFound(locale);
  }
  const player = await database.query.user.findFirst({
    where: eq(user.id, args.playerId),
    columns: {
      id: true,
      name: true,
      image: true,
      sports: true,
      preferredFootballRole: true,
      preferredFootballPosition: true,
      matchHistoryVisibility: true,
    },
  });
  if (!player) {
    throw notFound(locale);
  }

  const now = args.now ?? new Date();
  const historyHidden = await matchHistoryHidden(database, {
    viewerId: args.viewerId,
    playerId: player.id,
    visibility: player.matchHistoryVisibility,
  });
  const [rating, counted] = await Promise.all([
    sportRating(database, {
      userId: player.id,
      sport: GroupSportEnum.FOOTBALL,
    }),
    historyHidden
      ? Promise.resolve([])
      : loadCountedMatches(database, player.id, GameSportEnum.Football),
  ]);
  const shown = counted.slice(0, LAST_TEN_SIZE);
  const [goals, levelMoves, openable, partners, withViewer] = await Promise.all(
    [
      goalsByMatch(
        database,
        player.id,
        counted.map((match) => match.matchId),
      ),
      levelMovesByMatch(
        database,
        player.id,
        shown.map((match) => match.matchId),
      ),
      openableGameIds(database, args.viewerId, [
        ...new Set(shown.map((match) => match.gameId)),
      ]),
      mostPlayedPartners(database, { playerId: player.id, now }, counted),
      withViewerFrom(
        database,
        {
          viewerId: args.viewerId,
          playerId: player.id,
          sport: GroupSportEnum.FOOTBALL,
          historyHidden,
        },
        counted,
      ),
    ],
  );

  const lastMatches: FootballMatchInput[] = shown.map((match) => ({
    matchId: match.matchId,
    gameId: match.gameId,
    playedAt: match.displayTime,
    outcome: ownerOutcome(match),
    score: ownerScore(match),
    goals: goals.get(match.matchId) ?? 0,
    levelMove: levelMoves.get(match.matchId) ?? null,
    game: {
      name: match.game.name,
      hasCustomName: match.game.hasCustomName,
      windowStart: match.game.windowStart,
      windowEnd: match.game.windowEnd,
      groupName: match.game.groupName,
      venueName: match.venue.name,
    },
    canOpenGame: openable.has(match.gameId),
  }));

  return {
    player: {
      id: player.id,
      name: player.name,
      image: player.image,
      isViewer: player.id === args.viewerId,
    },
    historyHidden,
    sports: sportsPlayed(player.sports),
    venue: usualVenue(counted),
    rating,
    role: {
      role: player.preferredFootballRole,
      position: player.preferredFootballPosition,
    },
    overall: overallFrom(counted, goals),
    streaks: streaksFrom(counted),
    lastMatches,
    partners,
    withViewer,
  };
}

export const footballProfile = protectedProcedure
  .input(z.object({ userId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return loadFootballProfile(ctx.db, {
      viewerId: appUser.id,
      playerId: input.userId,
      locale: ctx.locale,
    });
  });
