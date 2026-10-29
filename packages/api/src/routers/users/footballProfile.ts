import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  GameSportEnum,
  GroupSportEnum,
  matchGoals,
  user,
  type DbClient,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  loadCountedMatches,
  mayViewPlayer,
  openableGameIds,
  sportRating,
  streaksFrom,
  usualVenue,
  type CountedMatch,
} from "#src/routers/users/playerProfile";
import { matchOutcome } from "@repo/domain/match-outcome";
import { outcomeForSlot } from "@repo/domain/match-slots";
import type { FootballMatchInput } from "@repo/domain/player-profile-football";
import { LAST_TEN_SIZE } from "@repo/domain/player-profile-matches";
import type { MatchOutcome } from "@repo/domain/result-mark";
import { sportsPlayed } from "@repo/domain/sport";

const notFound = () =>
  new TRPCError({ code: "NOT_FOUND", message: "Player not found" });

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
  args: { viewerId: string; playerId: string; now?: Date },
) {
  if (!(await mayViewPlayer(database, args))) {
    throw notFound();
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
    },
  });
  if (!player) {
    throw notFound();
  }

  const now = args.now ?? new Date();
  const [rating, counted] = await Promise.all([
    sportRating(database, {
      userId: player.id,
      sport: GroupSportEnum.FOOTBALL,
      now,
    }),
    loadCountedMatches(database, player.id, GameSportEnum.Football),
  ]);
  const shown = counted.slice(0, LAST_TEN_SIZE);
  const [goals, openable] = await Promise.all([
    goalsByMatch(
      database,
      player.id,
      counted.map((match) => match.matchId),
    ),
    openableGameIds(database, args.viewerId, [
      ...new Set(shown.map((match) => match.gameId)),
    ]),
  ]);

  const lastMatches: FootballMatchInput[] = shown.map((match) => ({
    matchId: match.matchId,
    gameId: match.gameId,
    playedAt: match.displayTime,
    outcome: ownerOutcome(match),
    score: ownerScore(match),
    goals: goals.get(match.matchId) ?? 0,
    game: {
      name: match.game.name,
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
  };
}

export const footballProfile = protectedProcedure
  .input(z.object({ userId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return loadFootballProfile(ctx.db, {
      viewerId: appUser.id,
      playerId: input.userId,
    });
  });
