import type { DbClient } from "@repo/db";
import { inArray } from "drizzle-orm";

import { games, groupMembers, groupSeasons } from "@repo/db";

import {
  defaultSeasonLens,
  groupSeasonStatus,
  isInSeasonWindow,
  type GroupSeasonData,
} from "@repo/domain/group-season";
import {
  seasonStandingTable,
  standingDiffUnit,
  type SeasonStandingMatch,
  type SeasonStandingRow,
} from "@repo/domain/season-standing";
import { MATCH_STATUS } from "@repo/domain/match-status";

type SlotTeam = {
  players: readonly {
    gamePlayer: { userId: string | null } | null;
  }[];
} | null;

export function slotUserIds(team: SlotTeam): string[] {
  const userIds: string[] = [];
  for (const link of team?.players ?? []) {
    const userId = link.gamePlayer?.userId;
    if (userId) {
      userIds.push(userId);
    }
  }
  return userIds;
}

export type StandingGameRow = {
  groupId: string | null;
  cancelledAt: Date | null;
  windowStart: Date | null;
  createdAt: Date;
  matches: readonly {
    status: string | null;
    startTime: Date | null;
    createdAt: Date;
    sets: readonly {
      slot1GamesWon: number | null;
      slot2GamesWon: number | null;
    }[];
    slot1GameTeam: SlotTeam;
    slot2GameTeam: SlotTeam;
  }[];
};

/**
 * The Matches a Standing reads, from the Group's Games with a cancelled Game
 * already dropped. A Match is placed in time by its own start, else the
 * Game's, else when it was created.
 */
export function standingMatchesFromGames(
  gameRows: readonly StandingGameRow[],
): SeasonStandingMatch[] {
  const list: SeasonStandingMatch[] = [];
  for (const game of gameRows) {
    if (game.cancelledAt !== null) {
      continue;
    }
    for (const match of game.matches) {
      list.push({
        status: match.status,
        playedAt: match.startTime ?? game.windowStart ?? match.createdAt,
        sets: match.sets,
        slot1UserIds: slotUserIds(match.slot1GameTeam),
        slot2UserIds: slotUserIds(match.slot2GameTeam),
      });
    }
  }
  return list;
}

export type GroupSeasonRow = GroupSeasonData & {
  status: "upcoming" | "active" | "closed";
};

export function toSeasonRow(
  season: typeof groupSeasons.$inferSelect,
  now: Date,
): GroupSeasonRow {
  return {
    id: season.id,
    name: season.name,
    startsOn: season.startsOn,
    endsOn: season.endsOn,
    closedAt: season.closedAt,
    status: groupSeasonStatus(season, now),
  };
}

/** The Matches inside the lens: a Season's window, or all of them. */
export function matchesInLens(
  matches: readonly SeasonStandingMatch[],
  season: GroupSeasonData | null,
): SeasonStandingMatch[] {
  if (!season) {
    return [...matches];
  }
  return matches.filter((match) => isInSeasonWindow(season, match.playedAt));
}

export function countCompletedMatches(matches: readonly SeasonStandingMatch[]) {
  return matches.filter((match) => match.status === MATCH_STATUS.COMPLETED)
    .length;
}

export type GroupStandingMember = {
  userId: string;
  name: string;
  image: string | null;
};

export type GroupStanding = {
  /** The Season the rows read; `null` for all-time. */
  seasonId: string | null;
  rows: SeasonStandingRow<GroupStandingMember>[];
  gamesCounted: number;
  seasons: GroupSeasonRow[];
};

/**
 * Standing per Group for its default lens (the active Season, else the next,
 * else the latest closed, else all-time), derived on every read from the
 * Matches of the Group's Games, Rated or Unrated: only a Level is limited to
 * Rated Games (ADR-0045). The one loader behind Group home, the Groups list
 * and Home, so the three cannot disagree. Three reads whatever the number of
 * Groups.
 */
export async function loadGroupStandings(
  database: DbClient,
  groupIds: readonly string[],
  now: Date = new Date(),
): Promise<Map<string, GroupStanding>> {
  const byGroup = new Map<string, GroupStanding>();
  if (groupIds.length === 0) {
    return byGroup;
  }

  const [memberRows, seasonRows, gameRows] = await Promise.all([
    database.query.groupMembers.findMany({
      where: inArray(groupMembers.groupId, [...groupIds]),
      columns: { groupId: true, userId: true },
      with: { user: { columns: { name: true, image: true } } },
    }),
    database.query.groupSeasons.findMany({
      where: inArray(groupSeasons.groupId, [...groupIds]),
    }),
    database.query.games.findMany({
      where: inArray(games.groupId, [...groupIds]),
      columns: {
        id: true,
        groupId: true,
        cancelledAt: true,
        windowStart: true,
        createdAt: true,
      },
      with: {
        group: { columns: { sport: true } },
        matches: {
          columns: { status: true, startTime: true, createdAt: true },
          with: {
            sets: {
              columns: { slot1GamesWon: true, slot2GamesWon: true },
            },
            slot1GameTeam: {
              columns: { id: true },
              with: {
                players: {
                  columns: { id: true },
                  with: { gamePlayer: { columns: { userId: true } } },
                },
              },
            },
            slot2GameTeam: {
              columns: { id: true },
              with: {
                players: {
                  columns: { id: true },
                  with: { gamePlayer: { columns: { userId: true } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const gamesByGroup = new Map<string, typeof gameRows>();
  const sportByGroup = new Map<string, string | null>();
  for (const game of gameRows) {
    if (game.groupId === null) {
      continue;
    }
    const list = gamesByGroup.get(game.groupId) ?? [];
    list.push(game);
    gamesByGroup.set(game.groupId, list);
    sportByGroup.set(game.groupId, game.group?.sport ?? null);
  }

  const membersByGroup = new Map<string, GroupStandingMember[]>();
  for (const row of memberRows) {
    const list = membersByGroup.get(row.groupId) ?? [];
    list.push({
      userId: row.userId,
      name: row.user.name,
      image: row.user.image,
    });
    membersByGroup.set(row.groupId, list);
  }

  const seasonsByGroup = new Map<string, GroupSeasonRow[]>();
  for (const row of seasonRows) {
    const list = seasonsByGroup.get(row.groupId) ?? [];
    list.push(toSeasonRow(row, now));
    seasonsByGroup.set(row.groupId, list);
  }

  for (const groupId of groupIds) {
    const seasons = seasonsByGroup.get(groupId) ?? [];
    const seasonId = defaultSeasonLens(seasons, now);
    const season = seasons.find((row) => row.id === seasonId) ?? null;
    const matches = matchesInLens(
      standingMatchesFromGames(gamesByGroup.get(groupId) ?? []),
      season,
    );
    byGroup.set(groupId, {
      seasonId,
      rows: seasonStandingTable(matches, membersByGroup.get(groupId) ?? [], {
        diffUnit: standingDiffUnit(sportByGroup.get(groupId)),
      }),
      gamesCounted: countCompletedMatches(matches),
      seasons,
    });
  }
  return byGroup;
}
