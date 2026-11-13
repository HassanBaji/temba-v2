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
  GroupMemberRoleEnum,
  groupMembers,
  groups,
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
import {
  readTembaLevelView,
  tembaLevelViews,
} from "#src/ratings/level-confirmed";
import { tierPointsShownTo } from "#src/ratings/group-tier-table";
import { calibrationVenueFor } from "#src/ratings/verifier-calibration";
import {
  myGroupTiers,
  type MyGroupTierRow,
} from "#src/routers/ratings/myGroupTiers";
import { summarizeCompletedMatchStats } from "@repo/domain/completed-matches";
import {
  bandFromLevel,
  bandWithHysteresis,
  formatLevel,
  levelFromMu,
  type YouRatingView,
} from "@repo/domain/level";
import { matchOutcome } from "@repo/domain/match-outcome";
import { outcomeForSlot, userSlotOnMatch } from "@repo/domain/match-slots";
import {
  LAST_TEN_SIZE,
  type PlayerMatchInput,
  type PlayerMatchPlayer,
} from "@repo/domain/player-profile-matches";
import { setWinsForGames } from "@repo/domain/set-wins-for-games";
import { sportsPlayed } from "@repo/domain/sport";
import { bestWinStreak, currentWinStreak } from "@repo/domain/win-streak";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

const VENUE_WINDOW = 10;
const VENUE_MIN_MATCHES = 2;

const notFound = (locale: Locale) =>
  new TRPCError({
    code: "NOT_FOUND",
    message: messagesFor(locale).profile.errors.playerNotFound,
  });

/**
 * A viewer may see a Player profile when they are that User, share a
 * current Group membership or a Game seat with them, or are a Verifier who
 * may calibrate them (ADR-0072). Everything else, including an unknown User,
 * reads as not found.
 */
async function sharesGroup(
  database: DbClient,
  args: { viewerId: string; playerId: string },
) {
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
  return sharedGroup != null;
}

/**
 * Whether the owner's Match history visibility hides their form, stats and
 * partners from this viewer, who then sees Level and side only.
 */
export async function matchHistoryHidden(
  database: DbClient,
  args: {
    viewerId: string;
    playerId: string;
    visibility: "everyone" | "group_members" | "only_me";
  },
) {
  if (args.viewerId === args.playerId || args.visibility === "everyone") {
    return false;
  }
  if (args.visibility === "only_me") {
    return true;
  }
  return !(await sharesGroup(database, args));
}

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
  if (sharedGame) {
    return true;
  }

  const calibration = await calibrationVenueFor(database, {
    verifierUserId: args.viewerId,
    targetUserId: args.playerId,
  });
  return calibration.venue !== null;
}

export type CountedMatch = {
  matchId: string;
  gameId: string;
  createdAt: Date;
  displayTime: Date;
  userSlot: 1 | 2;
  position: "left" | "right" | null;
  slotTeamIds: { 1: string | null; 2: string | null };
  sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
  venue: { id: string; name: string };
  groupId: string | null;
  game: Omit<PlayerMatchInput["game"], "venueName"> & {
    hasCustomName: boolean;
    windowStart: Date | null;
    windowEnd: Date | null;
  };
  rated: boolean;
};

function newestFirst(left: CountedMatch, right: CountedMatch) {
  const time = right.displayTime.getTime() - left.displayTime.getTime();
  if (time !== 0) {
    return time;
  }
  return right.createdAt.getTime() - left.createdAt.getTime();
}

/** Completed Matches of one sport the User sat on, in any format, newest first. */
export async function loadCountedMatches(
  database: DbClient,
  userId: string,
  sport: "padel" | "football",
): Promise<CountedMatch[]> {
  const seats = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.userId, userId),
    columns: { id: true },
    with: {
      gameTeamPlayers: {
        columns: { gameTeamId: true, position: true, eitherSide: true },
        with: {
          gameTeam: {
            columns: {},
            with: { players: { columns: { eitherSide: true } } },
          },
        },
      },
    },
  });
  // Either side next to a partner who picked is the other Position ("auto");
  // two Either-side Users on one Game team recorded no Position.
  const positionByTeam = new Map(
    seats.flatMap((seat) =>
      seat.gameTeamPlayers.map((link) => [
        link.gameTeamId,
        link.eitherSide &&
        link.gameTeam.players.every((player) => player.eitherSide)
          ? null
          : link.position,
      ]),
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
          hasCustomName: true,
          groupId: true,
          cancelledAt: true,
          sport: true,
          windowStart: true,
          windowEnd: true,
          createdAt: true,
          format: true,
          rated: true,
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
    if (game.cancelledAt != null || game.sport !== sport) {
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
      groupId: game.groupId,
      rated: game.rated,
      game: {
        name: game.name,
        hasCustomName: game.hasCustomName,
        windowStart: game.windowStart,
        windowEnd: game.windowEnd,
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
export function usualVenue(newest: readonly Pick<CountedMatch, "venue">[]) {
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
async function currentLevels(database: DbClient, userIds: readonly string[]) {
  if (userIds.length === 0) {
    return new Map<string, YouRatingView>();
  }
  const rows = await database.query.ratings.findMany({
    where: and(
      inArray(ratings.userId, [...userIds]),
      eq(ratings.sport, GroupSportEnum.PADEL),
    ),
  });
  const view = await tembaLevelViews(database, rows);
  return new Map(rows.map((row) => [row.userId, view(row)]));
}

export async function teamPlayers(
  database: DbClient,
  teamIds: readonly string[],
) {
  const links =
    teamIds.length === 0
      ? []
      : await database.query.gameTeamPlayers.findMany({
          where: inArray(gameTeamPlayers.gameTeamId, [...teamIds]),
          columns: { gameTeamId: true },
          orderBy: (table, { asc }) => [
            asc(table.position),
            asc(table.createdAt),
            asc(table.id),
          ],
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
  const levels = await currentLevels(database, [
    ...new Set(people.map((person) => person.user.id)),
  ]);

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

export type TeamPlayer = { userId: string; name: string; image: string | null };

const PARTNER_COUNT = 3;

// A completed Match with no scored Set has no winner, so it reads as a draw.
function ownerOutcome(match: Pick<CountedMatch, "userSlot" | "sets">) {
  return (
    outcomeForSlot(match.userSlot, matchOutcome(match.sets).result) ?? "draw"
  );
}

/** The three people the owner shared a side with most, with the record they made together. */
export function partnersFrom(
  userId: string,
  matches: readonly CountedMatch[],
  playersOf: (teamId: string | null) => TeamPlayer[],
) {
  const partners = new Map<
    string,
    TeamPlayer & { won: number; lost: number; played: number; lastAt: number }
  >();
  for (const match of matches) {
    const outcome = ownerOutcome(match);
    for (const player of playersOf(match.slotTeamIds[match.userSlot])) {
      if (player.userId === userId) {
        continue;
      }
      const entry = partners.get(player.userId) ?? {
        ...player,
        won: 0,
        lost: 0,
        played: 0,
        lastAt: 0,
      };
      entry.played += 1;
      entry.won += outcome === "won" ? 1 : 0;
      entry.lost += outcome === "lost" ? 1 : 0;
      entry.lastAt = Math.max(entry.lastAt, match.displayTime.getTime());
      partners.set(player.userId, entry);
    }
  }
  return [...partners.values()]
    .sort(
      (left, right) =>
        right.played - left.played ||
        right.lastAt - left.lastAt ||
        (left.userId < right.userId ? -1 : 1),
    )
    .slice(0, PARTNER_COUNT)
    .map(({ userId: id, name, image, won, lost, played }) => ({
      userId: id,
      name,
      image,
      won,
      lost,
      played,
    }));
}

/** Partners (padel) or teammates (football) across every counted Match. */
export async function mostPlayedPartners(
  database: DbClient,
  args: { playerId: string; now: Date },
  counted: readonly CountedMatch[],
) {
  const ownTeamIds = [
    ...new Set(
      counted.flatMap((match) => {
        const teamId = match.slotTeamIds[match.userSlot];
        return teamId ? [teamId] : [];
      }),
    ),
  ];
  const players = await teamPlayers(database, ownTeamIds);
  return partnersFrom(args.playerId, counted, (teamId) =>
    teamId ? (players.get(teamId) ?? []) : [],
  );
}

async function sharedGroupNames(
  database: DbClient,
  args: { viewerId: string; playerId: string; sport: GroupSportEnum },
) {
  const viewerMember = alias(groupMembers, "viewer_member");
  const playerMember = alias(groupMembers, "player_member");
  const rows = await database
    .select({ name: groups.name, sport: groups.sport })
    .from(viewerMember)
    .innerJoin(playerMember, eq(viewerMember.groupId, playerMember.groupId))
    .innerJoin(groups, eq(groups.id, viewerMember.groupId))
    .where(
      and(
        eq(viewerMember.userId, args.viewerId),
        eq(playerMember.userId, args.playerId),
      ),
    );
  return rows
    .filter((row) => (row.sport ?? GroupSportEnum.PADEL) === args.sport)
    .flatMap((row) => (row.name?.trim() ? [row.name.trim()] : []))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * What the viewer and the owner share in one sport: their record on the same
 * side, their head-to-head from the owner's side, and the Groups both are in.
 * Null on the viewer's own profile, while the owner hides their Match history,
 * and when they share neither a Match nor a Group of the sport.
 */
export async function withViewerFrom(
  database: DbClient,
  args: {
    viewerId: string;
    playerId: string;
    sport: GroupSportEnum;
    historyHidden: boolean;
  },
  counted: readonly CountedMatch[],
) {
  if (args.viewerId === args.playerId || args.historyHidden) {
    return null;
  }
  const teamIds = [
    ...new Set(
      counted.flatMap((match) =>
        [match.slotTeamIds[1], match.slotTeamIds[2]].filter(
          (id): id is string => id != null,
        ),
      ),
    ),
  ];
  const [viewerLinks, sharedGroups] = await Promise.all([
    teamIds.length === 0
      ? Promise.resolve([])
      : database
          .select({ gameTeamId: gameTeamPlayers.gameTeamId })
          .from(gameTeamPlayers)
          .innerJoin(
            gamePlayers,
            eq(gamePlayers.id, gameTeamPlayers.gamePlayerId),
          )
          .where(
            and(
              eq(gamePlayers.userId, args.viewerId),
              inArray(gameTeamPlayers.gameTeamId, teamIds),
            ),
          ),
    sharedGroupNames(database, args),
  ]);
  const viewerTeams = new Set(viewerLinks.map((link) => link.gameTeamId));
  const together = { played: 0, won: 0, lost: 0, drawn: 0 };
  const against = { played: 0, won: 0, lost: 0, drawn: 0 };
  for (const match of counted) {
    const own = match.slotTeamIds[match.userSlot];
    const other = match.slotTeamIds[match.userSlot === 1 ? 2 : 1];
    const tally =
      own && viewerTeams.has(own)
        ? together
        : other && viewerTeams.has(other)
          ? against
          : null;
    if (!tally) {
      continue;
    }
    const outcome = ownerOutcome(match);
    tally.played += 1;
    if (outcome === "won") {
      tally.won += 1;
    } else if (outcome === "lost") {
      tally.lost += 1;
    } else {
      tally.drawn += 1;
    }
  }
  if (together.played + against.played === 0 && sharedGroups.length === 0) {
    return null;
  }
  return { together, against, sharedGroups };
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

export type SharedGroupTierRow = Omit<MyGroupTierRow, "points"> & {
  /** Null while Provisional, unless the viewer may see them. */
  points: number | null;
};

/**
 * The player's Group Tier in each tier Group the viewer is also a member of,
 * cut as Members cuts it (ADR-0067). Sharing only a Game shows none.
 */
async function sharedGroupTiers(
  database: DbClient,
  args: { viewerId: string; playerId: string },
): Promise<SharedGroupTierRow[]> {
  const tiers = await myGroupTiers(database, { userId: args.playerId });
  if (tiers.length === 0) {
    return [];
  }
  const self = args.viewerId === args.playerId;
  const viewerGroups = self
    ? null
    : await database
        .select({
          groupId: groupMembers.groupId,
          role: groupMembers.role,
          createdBy: groups.createdBy,
        })
        .from(groupMembers)
        .innerJoin(groups, eq(groups.id, groupMembers.groupId))
        .where(
          and(
            eq(groupMembers.userId, args.viewerId),
            inArray(
              groupMembers.groupId,
              tiers.map((tier) => tier.groupId),
            ),
          ),
        );
  const organizesByGroup = viewerGroups
    ? new Map(
        viewerGroups.map((row) => [
          row.groupId,
          row.createdBy === args.viewerId ||
            row.role === GroupMemberRoleEnum.ORGANIZER,
        ]),
      )
    : null;
  return tiers
    .filter(
      (tier) => organizesByGroup == null || organizesByGroup.has(tier.groupId),
    )
    .map((tier) => ({
      ...tier,
      points: tierPointsShownTo(
        {
          userId: args.playerId,
          points: tier.points,
          provisional: tier.provisional,
        },
        {
          userId: args.viewerId,
          organizes: organizesByGroup?.get(tier.groupId) ?? false,
        },
      ),
    }));
}

export async function openableGameIds(
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
    teamPlayers(database, teamIds),
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
      rated: match.rated,
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

export function streaksFrom(
  newest: readonly Pick<CountedMatch, "userSlot" | "sets" | "displayTime">[],
) {
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

export async function sportRating(
  database: DbClient,
  args: { userId: string; sport: GroupSportEnum },
) {
  const { userId, sport } = args;
  const row = await database.query.ratings.findFirst({
    where: and(eq(ratings.userId, userId), eq(ratings.sport, sport)),
  });
  if (!row) {
    return null;
  }
  const [events] = await database
    .select({ ratedMatchCount: count() })
    .from(ratingEvents)
    .where(and(eq(ratingEvents.userId, userId), eq(ratingEvents.sport, sport)));
  const view = await readTembaLevelView(database, row);
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
      preferredPosition: true,
      sports: true,
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
  const [rating, counted, calibration, tiers] = await Promise.all([
    sportRating(database, {
      userId: player.id,
      sport: GroupSportEnum.PADEL,
    }),
    historyHidden
      ? Promise.resolve([])
      : loadCountedMatches(database, player.id, GameSportEnum.PADEL),
    calibrationVenueFor(database, {
      verifierUserId: args.viewerId,
      targetUserId: player.id,
    }),
    sharedGroupTiers(database, {
      viewerId: args.viewerId,
      playerId: player.id,
    }),
  ]);
  const [lastMatches, partners, withViewer] = await Promise.all([
    lastMatchesFrom(
      database,
      { viewerId: args.viewerId, playerId: player.id, now },
      counted,
    ),
    mostPlayedPartners(database, { playerId: player.id, now }, counted),
    withViewerFrom(
      database,
      {
        viewerId: args.viewerId,
        playerId: player.id,
        sport: GroupSportEnum.PADEL,
        historyHidden,
      },
      counted,
    ),
  ]);

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
    trend: trendFrom(lastMatches),
    overall: overallFrom(counted),
    streaks: streaksFrom(counted),
    position: {
      declared: player.preferredPosition,
      ...playedSideCounts(counted),
    },
    lastMatches,
    partners,
    withViewer,
    /** The viewer is a Verifier who may calibrate this player's Level, in either sport. */
    viewerMayCalibrate: calibration.venue !== null,
    /** The player's fish in each tier Group the viewer shares with them. */
    sharedGroupTiers: tiers,
  };
}

export const playerProfile = protectedProcedure
  .input(z.object({ userId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return loadPlayerProfile(ctx.db, {
      viewerId: appUser.id,
      playerId: input.userId,
      locale: ctx.locale,
    });
  });
