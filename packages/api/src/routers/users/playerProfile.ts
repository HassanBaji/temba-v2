import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import {
  GameSportEnum,
  GroupSportEnum,
  MatchStatusEnum,
  gamePlayers,
  groupMembers,
  matches,
  ratingEvents,
  ratings,
  user,
  type DbClient,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { gameListTime } from "#src/home/upcoming-games";
import { summarizeCompletedMatchStats } from "@repo/domain/completed-matches";
import { youRatingViewAfterIdle } from "@repo/domain/idle";
import { levelFromMu } from "@repo/domain/level";
import { matchOutcome } from "@repo/domain/match-outcome";
import { outcomeForSlot, userSlotOnMatch } from "@repo/domain/match-slots";
import { setWinsForGames } from "@repo/domain/set-wins-for-games";
import { bestWinStreak, currentWinStreak } from "@repo/domain/win-streak";

const VENUE_WINDOW = 10;
const VENUE_MIN_MATCHES = 2;

const notFound = () =>
  new TRPCError({ code: "NOT_FOUND", message: "Player not found" });

/**
 * A viewer may see a Player profile when they are that User, or share a
 * current Group membership or a Game seat with them. Everything else,
 * including an unknown User, reads as not found.
 */
export async function mayViewPlayer(
  database: DbClient,
  args: { viewerId: string; playerId: string },
): Promise<boolean> {
  if (args.viewerId === args.playerId) {
    return true;
  }

  const viewerMember = alias(groupMembers, "viewer_member");
  const playerMember = alias(groupMembers, "player_member");
  const [sharedGroup] = await database
    .select({ id: viewerMember.id })
    .from(viewerMember)
    .innerJoin(playerMember, eq(viewerMember.groupId, playerMember.groupId))
    .where(
      and(
        eq(viewerMember.userId, args.viewerId),
        eq(playerMember.userId, args.playerId),
      ),
    )
    .limit(1);
  if (sharedGroup) {
    return true;
  }

  const viewerSeat = alias(gamePlayers, "viewer_seat");
  const playerSeat = alias(gamePlayers, "player_seat");
  const [sharedGame] = await database
    .select({ id: viewerSeat.id })
    .from(viewerSeat)
    .innerJoin(playerSeat, eq(viewerSeat.gameId, playerSeat.gameId))
    .where(
      and(
        eq(viewerSeat.userId, args.viewerId),
        eq(playerSeat.userId, args.playerId),
      ),
    )
    .limit(1);
  return sharedGame != null;
}

type CountedMatch = {
  createdAt: Date;
  displayTime: Date;
  userSlot: 1 | 2;
  position: "left" | "right" | null;
  sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
  venue: { id: string; name: string };
};

function newestFirst(left: CountedMatch, right: CountedMatch) {
  const time = right.displayTime.getTime() - left.displayTime.getTime();
  if (time !== 0) {
    return time;
  }
  return right.createdAt.getTime() - left.createdAt.getTime();
}

/** Completed padel Matches the User sat on, in any format, newest first. */
async function loadCountedMatches(
  database: DbClient,
  userId: string,
): Promise<CountedMatch[]> {
  const seats = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.userId, userId),
    columns: { id: true },
    with: {
      gameTeamPlayers: { columns: { gameTeamId: true, position: true } },
    },
  });
  const positionByTeam = new Map(
    seats.flatMap((seat) =>
      seat.gameTeamPlayers.map((link) => [link.gameTeamId, link.position]),
    ),
  );
  const teamIds = new Set(positionByTeam.keys());
  if (teamIds.size === 0) {
    return [];
  }

  const rows = await database.query.matches.findMany({
    where: and(
      eq(matches.status, MatchStatusEnum.COMPLETED),
      or(
        inArray(matches.slot1GameTeamId, [...teamIds]),
        inArray(matches.slot2GameTeamId, [...teamIds]),
      ),
    ),
    columns: {
      startTime: true,
      createdAt: true,
      slot1GameTeamId: true,
      slot2GameTeamId: true,
    },
    with: {
      game: {
        columns: {
          id: true,
          groupId: true,
          cancelledAt: true,
          sport: true,
          windowStart: true,
          windowEnd: true,
          createdAt: true,
          format: true,
        },
        with: {
          venue: { columns: { id: true, name: true } },
          matches: { columns: { startTime: true, status: true } },
        },
      },
      sets: {
        columns: { slot1GamesWon: true, slot2GamesWon: true },
        orderBy: (table, { asc }) => [asc(table.setNumber)],
      },
    },
  });

  const counted: CountedMatch[] = [];
  for (const row of rows) {
    const game = row.game;
    if (game.cancelledAt != null || game.sport === GameSportEnum.Football) {
      continue;
    }
    const userSlot = userSlotOnMatch(row, teamIds);
    if (userSlot == null) {
      continue;
    }
    const userTeamId =
      userSlot === 1 ? row.slot1GameTeamId : row.slot2GameTeamId;
    counted.push({
      createdAt: row.createdAt,
      displayTime: row.startTime ?? gameListTime(game),
      userSlot,
      position: userTeamId ? (positionByTeam.get(userTeamId) ?? null) : null,
      sets: row.sets,
      venue: game.venue,
    });
  }
  return counted.sort(newestFirst);
}

/**
 * The most frequent Venue over the newest Matches. A tie goes to the Venue
 * played more recently; fewer than two Matches there is no habit yet.
 */
function usualVenue(newest: readonly CountedMatch[]) {
  const tally = new Map<string, { name: string; count: number }>();
  for (const match of newest.slice(0, VENUE_WINDOW)) {
    const entry = tally.get(match.venue.id);
    if (entry) {
      entry.count += 1;
    } else {
      tally.set(match.venue.id, { name: match.venue.name, count: 1 });
    }
  }
  let best: { name: string; count: number } | null = null;
  for (const entry of tally.values()) {
    if (!best || entry.count > best.count) {
      best = entry;
    }
  }
  return best && best.count >= VENUE_MIN_MATCHES ? { name: best.name } : null;
}

function overallFrom(counted: readonly CountedMatch[]) {
  const summary = summarizeCompletedMatchStats(counted);
  let drawn = 0;
  let setsPlayed = 0;
  for (const match of counted) {
    if (matchOutcome(match.sets).result === "draw") {
      drawn += 1;
    }
    for (const set of match.sets) {
      if (setWinsForGames(set.slot1GamesWon, set.slot2GamesWon)) {
        setsPlayed += 1;
      }
    }
  }
  return {
    played: summary.gamesPlayed,
    won: summary.gamesWon,
    lost: summary.gamesLost,
    drawn,
    setsWon: summary.setsWon,
    setsPlayed,
  };
}

function streaksFrom(newest: readonly CountedMatch[]) {
  const results = newest.map((match) => ({
    won:
      outcomeForSlot(match.userSlot, matchOutcome(match.sets).result) === "won",
    playedAt: match.displayTime,
  }));
  const best = bestWinStreak(results);
  return {
    current: currentWinStreak(results),
    best: best.count,
    bestReachedAt: best.reachedAt,
  };
}

/** Left and right counts over the Matches with a recorded Position. */
function playedSideCounts(counted: readonly CountedMatch[]) {
  let leftCount = 0;
  let rightCount = 0;
  for (const match of counted) {
    if (match.position === "left") {
      leftCount += 1;
    } else if (match.position === "right") {
      rightCount += 1;
    }
  }
  return { recordedCount: leftCount + rightCount, leftCount, rightCount };
}

async function padelRating(database: DbClient, userId: string, now: Date) {
  const row = await database.query.ratings.findFirst({
    where: and(
      eq(ratings.userId, userId),
      eq(ratings.sport, GroupSportEnum.PADEL),
    ),
  });
  if (!row) {
    return null;
  }
  const [events] = await database
    .select({ ratedMatchCount: count() })
    .from(ratingEvents)
    .where(
      and(
        eq(ratingEvents.userId, userId),
        eq(ratingEvents.sport, GroupSportEnum.PADEL),
      ),
    );
  const view = youRatingViewAfterIdle(row, now);
  return {
    level: view.level,
    levelBand: view.levelBand,
    provisional: view.provisional,
    ratedMatchCount: Number(events?.ratedMatchCount ?? 0),
    ratedMatchesRemaining: view.ratedMatchesRemaining,
    levelValue: levelFromMu(row.mu),
  };
}

export async function loadPlayerProfile(
  database: DbClient,
  args: { viewerId: string; playerId: string; now?: Date },
) {
  if (!(await mayViewPlayer(database, args))) {
    throw notFound();
  }
  const player = await database.query.user.findFirst({
    where: eq(user.id, args.playerId),
    columns: { id: true, name: true, image: true, preferredPosition: true },
  });
  if (!player) {
    throw notFound();
  }

  const [rating, counted] = await Promise.all([
    padelRating(database, player.id, args.now ?? new Date()),
    loadCountedMatches(database, player.id),
  ]);

  return {
    player: {
      id: player.id,
      name: player.name,
      image: player.image,
      isViewer: player.id === args.viewerId,
    },
    venue: usualVenue(counted),
    rating,
    overall: overallFrom(counted),
    streaks: streaksFrom(counted),
    position: {
      declared: player.preferredPosition,
      ...playedSideCounts(counted),
    },
  };
}

export const playerProfile = protectedProcedure
  .input(z.object({ userId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return loadPlayerProfile(ctx.db, {
      viewerId: appUser.id,
      playerId: input.userId,
    });
  });
