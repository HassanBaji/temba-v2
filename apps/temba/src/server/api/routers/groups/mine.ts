import { eq, inArray } from "drizzle-orm";

import { games, groupMembers, type GroupSportEnum } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  groupFormMarks,
  type GroupFormMatch,
} from "~/server/groups/member-form-marks";
import { nextGameStartTimeByGroup } from "~/server/groups/next-game";
import {
  sortStandingMembers,
  standingPosition,
} from "~/server/standing/compare-standing";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

type SlotTeam = {
  players: readonly {
    gamePlayer: { userId: string | null } | null;
  }[];
} | null;

function slotUserIds(team: SlotTeam): string[] {
  const userIds: string[] = [];
  for (const link of team?.players ?? []) {
    const userId = link.gamePlayer?.userId;
    if (userId) {
      userIds.push(userId);
    }
  }
  return userIds;
}

/**
 * Groups the caller is a member of (Loose Groups and joined Club Groups),
 * carrying the facts the Groups list leads with: how many members, where the
 * viewer stands, when the Group next plays, and how the viewer has been going
 * (`.scratch/groups-redesign/spec.md` §1.1 and §6).
 *
 * Three reads, whatever the number of Groups: the caller's memberships, the
 * member rows of those Groups, and the Games of those Groups with their
 * Matches. The Games read is batched across every Group id — one read per
 * Group would make a hot list query N+1 (spec Risk 2).
 */
export async function mine(
  database: DbClient,
  args: { userId: string; now?: Date },
) {
  const now = args.now ?? new Date();

  const memberships = await database.query.groupMembers.findMany({
    where: eq(groupMembers.userId, args.userId),
    with: {
      group: {
        with: {
          community: true,
        },
      },
    },
  });

  if (memberships.length === 0) {
    return [];
  }

  const groupIds = memberships.map((membership) => membership.groupId);
  const groupIdSet = new Set(groupIds);

  const memberRows = await database.query.groupMembers.findMany({
    where: inArray(groupMembers.groupId, groupIds),
    columns: {
      groupId: true,
      userId: true,
      totalSetsWon: true,
      totalPointsWon: true,
      totalGamesPlayed: true,
    },
    with: {
      user: {
        columns: { name: true },
      },
    },
  });

  const membersByGroup = new Map<string, typeof memberRows>();
  for (const row of memberRows) {
    const list = membersByGroup.get(row.groupId) ?? [];
    list.push(row);
    membersByGroup.set(row.groupId, list);
  }

  const gameRows = await database.query.games.findMany({
    where: inArray(games.groupId, groupIds),
    columns: {
      id: true,
      groupId: true,
      cancelledAt: true,
      windowStart: true,
      windowEnd: true,
      createdAt: true,
      format: true,
    },
    with: {
      matches: {
        columns: {
          startTime: true,
          status: true,
          createdAt: true,
        },
        with: {
          sets: {
            columns: { slot1GamesWon: true, slot2GamesWon: true },
            orderBy: (table, { asc }) => [asc(table.setNumber)],
          },
          slot1GameTeam: {
            columns: { id: true },
            with: {
              players: {
                columns: { id: true },
                with: {
                  gamePlayer: { columns: { userId: true } },
                },
              },
            },
          },
          slot2GameTeam: {
            columns: { id: true },
            with: {
              players: {
                columns: { id: true },
                with: {
                  gamePlayer: { columns: { userId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const nextGameByGroup = nextGameStartTimeByGroup(gameRows, groupIdSet, now);

  // Cancelled Games never become form, so they are dropped before the
  // derivation sees them.
  const formMatchesByGroup = new Map<string, GroupFormMatch[]>();
  for (const game of gameRows) {
    if (game.groupId === null || game.cancelledAt !== null) {
      continue;
    }
    const list = formMatchesByGroup.get(game.groupId) ?? [];
    for (const match of game.matches) {
      list.push({
        slot1UserIds: slotUserIds(match.slot1GameTeam),
        slot2UserIds: slotUserIds(match.slot2GameTeam),
        status: match.status,
        startTime: match.startTime,
        createdAt: match.createdAt,
        sets: match.sets,
      });
    }
    formMatchesByGroup.set(game.groupId, list);
  }

  return memberships.map((membership) => {
    const group = membership.group;
    const community = group.community;
    const members = membersByGroup.get(group.id) ?? [];

    // A member who has not played yet holds no standing position: they sort
    // by name below everyone with results, which is not a rank worth reading.
    const viewerHasResults =
      membership.totalSetsWon > 0 ||
      membership.totalPointsWon > 0 ||
      membership.totalGamesPlayed > 0;

    const sortedStanding = sortStandingMembers(
      members.map((row) => ({
        userId: row.userId,
        totalSetsWon: row.totalSetsWon,
        totalPointsWon: row.totalPointsWon,
        totalGamesPlayed: row.totalGamesPlayed,
        name: row.user.name,
      })),
    );

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      type: group.type,
      sport: group.sport as GroupSportEnum | null,
      community: community
        ? {
            id: community.id,
            name: community.name,
            archivedAt: community.archivedAt,
          }
        : null,
      memberCount: members.length,
      standingPosition: viewerHasResults
        ? standingPosition(sortedStanding, args.userId)
        : null,
      nextGameStartTime: nextGameByGroup.get(group.id) ?? null,
      formMarks: groupFormMarks(
        formMatchesByGroup.get(group.id) ?? [],
        args.userId,
        now,
      ),
    };
  });
}

export const mineProcedure = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return mine(ctx.db, { userId: appUser.id });
});
