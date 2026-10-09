import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import {
  GameSportEnum,
  GroupSportEnum,
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  games,
  groupMembers,
  matches,
  ratingEvents,
  ratings,
  user,
  type DbClient,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { canViewGame } from "#src/games/access";
import { gameListTime } from "#src/home/upcoming-games";
import { summarizeCompletedMatchStats } from "@repo/domain/completed-matches";
import { youRatingViewAfterIdle } from "@repo/domain/idle";
import {
  bandFromLevel,
  bandWithHysteresis,
  formatLevel,
  levelFromMu,
} from "@repo/domain/level";
import { matchOutcome } from "@repo/domain/match-outcome";
import { outcomeForSlot, userSlotOnMatch } from "@repo/domain/match-slots";
import {
  LAST_TEN_SIZE,
  type PlayerMatchInput,
  type PlayerMatchPlayer,
} from "@repo/domain/player-profile-matches";
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
  matchId: string;
  gameId: string;
  createdAt: Date;
  displayTime: Date;
  userSlot: 1 | 2;
  position: "left" | "right" | null;
  slotTeamIds: { 1: string | null; 2: string | null };
  sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
  venue: { id: string; name: string };
  game: Omit<PlayerMatchInput["game"], "venueName">;
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
      id: true,
      startTime: true,
      createdAt: true,
      slot1GameTeamId: true,
      slot2GameTeamId: true,
      roundNumber: true,
      knockoutRound: true,
    },
    with: {
      game: {
        columns: {
          id: true,
          name: true,
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
          group: { columns: { name: true } },
          matches: {
            columns: { startTime: true, status: true, knockoutRound: true },
          },
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
      matchId: row.id,
      gameId: game.id,
      createdAt: row.createdAt,
      displayTime: row.startTime ?? gameListTime(game),
      userSlot,
      position: userTeamId ? (positionByTeam.get(userTeamId) ?? null) : null,
      slotTeamIds: { 1: row.slot1GameTeamId, 2: row.slot2GameTeamId },
      sets: row.sets,
      venue: game.venue,
      game: {
        name: game.name,
        format: game.format,
        groupName: game.group?.name ?? null,
        roundNumber: row.roundNumber,
        knockoutRound:
          row.knockoutRound == null
            ? null
            : {
                round: row.knockoutRound,
                roundCount: Math.max(
                  ...game.matches.map((match) => match.knockoutRound ?? 0),
                ),
              },
      },
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

/** Each player's current padel Level, read the way their own profile reads it. */
async function currentLevels(
  database: DbClient,
  userIds: readonly string[],
  now: Date,
) {
  if (userIds.length === 0) {
    return new Map<string, ReturnType<typeof youRatingViewAfterIdle>>();
  }
  const rows = await database.query.ratings.findMany({
    where: and(
      inArray(ratings.userId, [...userIds]),
      eq(ratings.sport, GroupSportEnum.PADEL),
    ),
  });
  return new Map(
    rows.map((row) => [row.userId, youRatingViewAfterIdle(row, now)]),
  );
}

async function teamPlayers(
  database: DbClient,
  teamIds: readonly string[],
  now: Date,
) {
  const links =
    teamIds.length === 0
      ? []
      : await database.query.gameTeamPlayers.findMany({
          where: inArray(gameTeamPlayers.gameTeamId, [...teamIds]),
          columns: { gameTeamId: true },
          orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
          with: {
            gamePlayer: {
              columns: {},
              with: {
                user: { columns: { id: true, name: true, image: true } },
              },
            },
          },
        });
  const people = links.flatMap((link) =>
    link.gamePlayer.user
      ? [{ teamId: link.gameTeamId, user: link.gamePlayer.user }]
      : [],
  );
  const levels = await currentLevels(
    database,
    [...new Set(people.map((person) => person.user.id))],
    now,
  );

  const byTeam = new Map<string, PlayerMatchPlayer[]>();
  for (const person of people) {
    const level = levels.get(person.user.id);
    const players = byTeam.get(person.teamId) ?? [];
    players.push({
      userId: person.user.id,
      name: person.user.name,
      image: person.user.image,
      levelBand: level?.levelBand ?? null,
      level: level?.level ?? null,
      provisional: level?.provisional ?? false,
    });
    byTeam.set(person.teamId, players);
  }
  return byTeam;
}

/**
 * The owner's rating change per Match. The band in effect before the Match
 * is not stored, so it is rebuilt the way `games.byId` rebuilds it.
 */
async function ratingChanges(
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
            eq(ratingEvents.sport, GroupSportEnum.PADEL),
            inArray(ratingEvents.matchId, [...matchIds]),
          ),
          columns: { matchId: true, muBefore: true, muAfter: true },
        });
  return new Map(
    events.map((event) => {
      const before = levelFromMu(event.muBefore);
      const after = levelFromMu(event.muAfter);
      const levelBefore = Number(formatLevel(before));
      const levelAfter = Number(formatLevel(after));
      const bandBefore = bandFromLevel(before);
      return [
        event.matchId,
        {
          levelBefore,
          levelAfter,
          bandBefore,
          bandAfter: bandWithHysteresis(after, bandBefore),
          levelChange: Math.round((levelAfter - levelBefore) * 10) / 10,
        },
      ];
    }),
  );
}

async function openableGameIds(
  database: DbClient,
  viewerId: string,
  gameIds: readonly string[],
) {
  const rows =
    gameIds.length === 0
      ? []
      : await database.query.games.findMany({
          where: inArray(games.id, [...gameIds]),
        });
  const openable = new Set<string>();
  for (const game of rows) {
    if (await canViewGame(database, game, viewerId)) {
      openable.add(game.id);
    }
  }
  return openable;
}

async function lastMatchesFrom(
  database: DbClient,
  args: { viewerId: string; playerId: string; now: Date },
  newest: readonly CountedMatch[],
): Promise<PlayerMatchInput[]> {
  const shown = newest.slice(0, LAST_TEN_SIZE);
  const teamIds = shown.flatMap((match) =>
    [match.slotTeamIds[1], match.slotTeamIds[2]].filter(
      (id): id is string => id != null,
    ),
  );
  const [players, ratingByMatch, openable] = await Promise.all([
    teamPlayers(database, teamIds, args.now),
    ratingChanges(
      database,
      args.playerId,
      shown.map((match) => match.matchId),
    ),
    openableGameIds(database, args.viewerId, [
      ...new Set(shown.map((match) => match.gameId)),
    ]),
  ]);
  const playersOf = (teamId: string | null) =>
    teamId ? (players.get(teamId) ?? []) : [];

  return shown.map((match) => {
    // A completed Match with no scored Set has no winner, so it reads as a draw.
    const outcome = outcomeForSlot(
      match.userSlot,
      matchOutcome(match.sets).result,
    );
    return {
      matchId: match.matchId,
      gameId: match.gameId,
      playedAt: match.displayTime,
      outcome: outcome ?? "draw",
      game: { ...match.game, venueName: match.venue.name },
      ownerSlot: match.userSlot,
      slot1: playersOf(match.slotTeamIds[1]),
      slot2: playersOf(match.slotTeamIds[2]),
      sets: match.sets.flatMap((set) =>
        set.slot1GamesWon != null && set.slot2GamesWon != null
          ? [
              {
                slot1GamesWon: set.slot1GamesWon,
                slot2GamesWon: set.slot2GamesWon,
              },
            ]
          : [],
      ),
      rating: ratingByMatch.get(match.matchId) ?? null,
      canOpenGame: openable.has(match.gameId),
    };
  });
}

/** D5: the sum of the rated deltas, so it equals after-last minus before-first. */
function trendFrom(lastMatches: readonly PlayerMatchInput[]) {
  const rated = lastMatches.flatMap((match) =>
    match.rating ? [match.rating.levelChange] : [],
  );
  if (rated.length === 0) {
    return null;
  }
  const sum = rated.reduce((total, change) => total + change, 0);
  return { levelChange: Math.round(sum * 10) / 10 };
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

  const now = args.now ?? new Date();
  const [rating, counted] = await Promise.all([
    padelRating(database, player.id, now),
    loadCountedMatches(database, player.id),
  ]);
  const lastMatches = await lastMatchesFrom(
    database,
    { viewerId: args.viewerId, playerId: player.id, now },
    counted,
  );

  return {
    player: {
      id: player.id,
      name: player.name,
      image: player.image,
      isViewer: player.id === args.viewerId,
    },
    venue: usualVenue(counted),
    rating,
    trend: trendFrom(lastMatches),
    overall: overallFrom(counted),
    streaks: streaksFrom(counted),
    position: {
      declared: player.preferredPosition,
      ...playedSideCounts(counted),
    },
    lastMatches,
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
