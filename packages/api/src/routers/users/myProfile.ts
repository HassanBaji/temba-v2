import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  GameSportEnum,
  GroupSportEnum,
  groupLevelOverrides,
  groupMembers,
  groupRatingEvents,
  groupRatings,
  groups,
  levelOverrides,
  ratingEvents,
  ratings,
  user,
  type DbClient,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  loadCountedMatches,
  openableGameIds,
  partnersFrom,
  teamPlayers,
  type CountedMatch,
  type TeamPlayer,
} from "#src/routers/users/playerProfile";
import { youRatingViewAfterIdle } from "@repo/domain/idle";
import {
  BAND_UPPER_HUNDREDTHS,
  levelFromMu,
  progressToNextBand,
  type LevelBand,
} from "@repo/domain/level";
import { matchOutcome } from "@repo/domain/match-outcome";
import { outcomeForSlot } from "@repo/domain/match-slots";
import type { MatchOutcome } from "@repo/domain/result-mark";
import { setWinsForGames } from "@repo/domain/set-wins-for-games";
import type { Sport } from "@repo/domain/sport";
import { bestWinStreak } from "@repo/domain/win-streak";
import { sportSchema } from "@repo/validators/sport";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

/** Points on the rating curve, and how far back "this week" reaches. */
const HISTORY_POINT_LIMIT = 24;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_TEN = 10;
const RECENT_COUNT = 3;
/** Win rate shows once there are this many Matches in the scope. */
export const WIN_RATE_MINIMUM = 5;

type Change = {
  id: string;
  matchId: string | null;
  createdAt: Date;
  muBefore: number;
  muAfter: number;
};

type Scope =
  | { kind: "general"; sport: GroupSportEnum }
  | { kind: "group"; groupId: string; sport: GroupSportEnum };

function rounded(value: number) {
  return Math.round(value * 100) / 100;
}

function levelDelta(change: Pick<Change, "muBefore" | "muAfter">) {
  return rounded(levelFromMu(change.muAfter) - levelFromMu(change.muBefore));
}

function byTime(left: Change, right: Change) {
  return (
    left.createdAt.getTime() - right.createdAt.getTime() ||
    (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
  );
}

/** Rated Match events and hand-set Levels for the scope, oldest first. */
async function levelChanges(
  database: DbClient,
  userId: string,
  scope: Scope,
): Promise<Change[]> {
  if (scope.kind === "general") {
    const [events, overrides] = await Promise.all([
      database.query.ratingEvents.findMany({
        where: and(
          eq(ratingEvents.userId, userId),
          eq(ratingEvents.sport, scope.sport),
        ),
        columns: {
          id: true,
          matchId: true,
          createdAt: true,
          muBefore: true,
          muAfter: true,
        },
      }),
      database.query.levelOverrides.findMany({
        where: and(
          eq(levelOverrides.userId, userId),
          eq(levelOverrides.sport, scope.sport),
        ),
        columns: { id: true, createdAt: true, muBefore: true, muAfter: true },
      }),
    ]);
    return [
      ...events,
      ...overrides.map((row) => ({ ...row, matchId: null })),
    ].sort(byTime);
  }
  const [events, overrides] = await Promise.all([
    database.query.groupRatingEvents.findMany({
      where: and(
        eq(groupRatingEvents.userId, userId),
        eq(groupRatingEvents.groupId, scope.groupId),
      ),
      columns: {
        id: true,
        matchId: true,
        createdAt: true,
        muBefore: true,
        muAfter: true,
      },
    }),
    database.query.groupLevelOverrides.findMany({
      where: and(
        eq(groupLevelOverrides.userId, userId),
        eq(groupLevelOverrides.groupId, scope.groupId),
      ),
      columns: { id: true, createdAt: true, muBefore: true, muAfter: true },
    }),
  ]);
  return [
    ...events,
    ...overrides.map((row) => ({ ...row, matchId: null })),
  ].sort(byTime);
}

async function scopeRating(database: DbClient, userId: string, scope: Scope) {
  if (scope.kind === "general") {
    return database.query.ratings.findFirst({
      where: and(eq(ratings.userId, userId), eq(ratings.sport, scope.sport)),
    });
  }
  return database.query.groupRatings.findFirst({
    where: and(
      eq(groupRatings.userId, userId),
      eq(groupRatings.groupId, scope.groupId),
    ),
  });
}

/**
 * How many wins like the recent ones would close the gap to the next band.
 * Null when there is no recent win to go by or no band above.
 */
export function winsToNextBand(
  level: number,
  band: LevelBand,
  recentWinGains: readonly number[],
): number | null {
  const gains = recentWinGains.filter((gain) => gain > 0).slice(0, 3);
  if (gains.length === 0 || band === "A") {
    return null;
  }
  const average = gains.reduce((sum, gain) => sum + gain, 0) / gains.length;
  const gap = BAND_UPPER_HUNDREDTHS[band] / 100 - level;
  return Math.max(1, Math.ceil(gap / average));
}

function ownerOutcome(match: CountedMatch): MatchOutcome {
  return (
    outcomeForSlot(match.userSlot, matchOutcome(match.sets).result) ?? "draw"
  );
}

function setsTally(matches: readonly CountedMatch[]) {
  let won = 0;
  let lost = 0;
  for (const match of matches) {
    for (const set of match.sets) {
      const wins = setWinsForGames(set.slot1GamesWon, set.slot2GamesWon);
      if (!wins) {
        continue;
      }
      const ours = match.userSlot === 1 ? wins.slot1SetWins : wins.slot2SetWins;
      const theirs =
        match.userSlot === 1 ? wins.slot2SetWins : wins.slot1SetWins;
      won += ours;
      lost += theirs;
    }
  }
  return { won, lost };
}

/** The run of the same result that ends at the newest Match. */
function currentRun(newest: readonly CountedMatch[]) {
  const first = newest[0];
  if (!first) {
    return null;
  }
  const outcome = ownerOutcome(first);
  if (outcome === "draw") {
    return null;
  }
  let length = 0;
  for (const match of newest) {
    if (ownerOutcome(match) !== outcome) {
      break;
    }
    length += 1;
  }
  return { outcome, count: length };
}

async function assertGroupScope(
  database: DbClient,
  userId: string,
  groupId: string,
  sport: Sport,
  locale: Locale = DEFAULT_LOCALE,
) {
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
    columns: { id: true, name: true, sport: true },
  });
  const member = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
    ),
    columns: { id: true },
  });
  if (!group || !member || (group.sport ?? "padel") !== sport) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).group.errors.notFound,
    });
  }
  return group;
}

/**
 * The You page for one sport and one scope (ADR-0053): General reads the
 * Temba Level and every Match of the sport; a Group reads that Group Level and
 * the Group's Matches. Level history, Last 10 with each Match's Level change,
 * sets, streaks, partners and the newest Matches.
 */
export async function loadMyProfile(
  database: DbClient,
  args: {
    userId: string;
    sport: Sport;
    groupId?: string;
    now?: Date;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const ratingSport =
    args.sport === "football" ? GroupSportEnum.FOOTBALL : GroupSportEnum.PADEL;
  const group = args.groupId
    ? await assertGroupScope(
        database,
        args.userId,
        args.groupId,
        args.sport,
        locale,
      )
    : null;
  const scope: Scope = group
    ? { kind: "group", groupId: group.id, sport: ratingSport }
    : { kind: "general", sport: ratingSport };

  const [owner, row, changes, allMatches] = await Promise.all([
    database.query.user.findFirst({
      where: eq(user.id, args.userId),
      columns: { hideRoasts: true },
    }),
    scopeRating(database, args.userId, scope),
    levelChanges(database, args.userId, scope),
    loadCountedMatches(
      database,
      args.userId,
      args.sport === "football" ? GameSportEnum.Football : GameSportEnum.PADEL,
    ),
  ]);
  const matches = group
    ? allMatches.filter((match) => match.groupId === group.id)
    : allMatches;

  const deltaByMatch = new Map(
    changes.flatMap((change) =>
      change.matchId ? [[change.matchId, levelDelta(change)] as const] : [],
    ),
  );
  const ratedMatchCount = deltaByMatch.size;

  let level = null;
  if (row) {
    const view = youRatingViewAfterIdle(
      { ...row, lastRatedAt: row.lastRatedAt ?? null },
      now,
    );
    const value = levelFromMu(row.mu);
    const progress = progressToNextBand(value, view.levelBand);
    const shown = changes.slice(-HISTORY_POINT_LIMIT);
    const firstShown = shown[0];
    const history = firstShown
      ? [
          { level: rounded(levelFromMu(firstShown.muBefore)), at: null },
          ...shown.map((change) => ({
            level: rounded(levelFromMu(change.muAfter)),
            at: change.createdAt,
          })),
        ]
      : [];
    const weekAgo = now.getTime() - WEEK_MS;
    const thisWeek = changes.filter(
      (change) => change.createdAt.getTime() >= weekAgo,
    );
    const lastOverride = [...changes]
      .reverse()
      .find((change) => change.matchId === null);
    const recentWinGains = matches
      .filter((match) => ownerOutcome(match) === "won")
      .map((match) => deltaByMatch.get(match.matchId) ?? 0);
    level = {
      level: view.level,
      rating: rounded(value),
      levelBand: view.levelBand,
      provisional: view.provisional,
      ratedMatchesRemaining: view.ratedMatchesRemaining,
      progressPercent: progress.progressPercent,
      nextBand: progress.nextBand,
      distanceToNext:
        progress.nextBand === null
          ? null
          : rounded(BAND_UPPER_HUNDREDTHS[view.levelBand] / 100 - value),
      winsToNext: winsToNextBand(value, view.levelBand, recentWinGains),
      weekDelta:
        thisWeek.length === 0
          ? null
          : rounded(
              thisWeek.reduce((sum, change) => sum + levelDelta(change), 0),
            ),
      history,
      lastOverrideAt: lastOverride?.createdAt ?? null,
    };
  }

  const won = matches.filter((match) => ownerOutcome(match) === "won").length;
  const lost = matches.filter((match) => ownerOutcome(match) === "lost").length;
  const best = bestWinStreak(
    matches.map((match) => ({
      won: ownerOutcome(match) === "won",
      playedAt: match.displayTime,
    })),
  );

  const lastTen = matches.slice(0, LAST_TEN).map((match) => ({
    matchId: match.matchId,
    outcome: ownerOutcome(match),
    delta: deltaByMatch.get(match.matchId) ?? null,
    playedAt: match.displayTime,
  }));

  const recentMatches = matches.slice(0, RECENT_COUNT);
  const partnerTeamIds = matches.map(
    (match) => match.slotTeamIds[match.userSlot],
  );
  const recentTeamIds = recentMatches.flatMap((match) => [
    match.slotTeamIds[1],
    match.slotTeamIds[2],
  ]);
  const teamIds = [
    ...new Set(
      [...partnerTeamIds, ...recentTeamIds].filter(
        (id): id is string => id != null,
      ),
    ),
  ];
  const [players, openable] = await Promise.all([
    teamPlayers(database, teamIds, now),
    openableGameIds(database, args.userId, [
      ...new Set(recentMatches.map((match) => match.gameId)),
    ]),
  ]);
  const playersOf = (teamId: string | null): TeamPlayer[] =>
    teamId ? (players.get(teamId) ?? []) : [];

  const recent = recentMatches.map((match) => {
    const own = match.userSlot;
    const other = own === 1 ? 2 : 1;
    return {
      matchId: match.matchId,
      gameId: match.gameId,
      playedAt: match.displayTime,
      outcome: ownerOutcome(match),
      partners: playersOf(match.slotTeamIds[own])
        .filter((player) => player.userId !== args.userId)
        .map((player) => player.name),
      opponents: playersOf(match.slotTeamIds[other]).map(
        (player) => player.name,
      ),
      sets: match.sets.flatMap((set) =>
        set.slot1GamesWon != null && set.slot2GamesWon != null
          ? [
              own === 1
                ? { us: set.slot1GamesWon, them: set.slot2GamesWon }
                : { us: set.slot2GamesWon, them: set.slot1GamesWon },
            ]
          : [],
      ),
      delta: deltaByMatch.get(match.matchId) ?? null,
      groupName: match.game.groupName,
      format: match.game.format,
      canOpenGame: openable.has(match.gameId),
    };
  });

  return {
    sport: args.sport,
    group: group ? { id: group.id, name: group.name ?? "" } : null,
    level,
    ratedMatchCount,
    stats: {
      played: matches.length,
      won,
      lost,
      drawn: matches.length - won - lost,
      winRatePercent:
        matches.length >= WIN_RATE_MINIMUM
          ? Math.round((won / matches.length) * 100)
          : null,
      run: currentRun(matches),
      sets: setsTally(matches),
      longestStreak: best.count > 0 ? best : null,
    },
    lastTen,
    partners: partnersFrom(args.userId, matches, playersOf),
    recent,
    hideRoasts: owner?.hideRoasts ?? false,
  };
}

export const myProfile = protectedProcedure
  .input(
    z.object({
      sport: sportSchema,
      groupId: z.string().uuid().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return loadMyProfile(ctx.db, {
      userId: appUser.id,
      sport: input.sport,
      groupId: input.groupId,
      locale: ctx.locale,
    });
  });
