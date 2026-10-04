import type { DbClient } from "@repo/db";
import { inArray } from "drizzle-orm";

import { games, groupMembers } from "@repo/db";

import {
  groupMemberStandingRecords,
  type GroupStandingMatch,
  type MemberStandingRecord,
} from "~/server/standing/group-standing";

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

export type GroupStandingMember = MemberStandingRecord & {
  userId: string;
  name: string;
};

/**
 * Standing members per Group, derived on every read from the completed
 * Matches of each Group's Games. The one loader behind Group home, the Groups
 * list and Home, so the three cannot disagree. Two reads whatever the number
 * of Groups.
 */
export async function loadGroupStandingMembers(
  database: DbClient,
  groupIds: readonly string[],
): Promise<Map<string, GroupStandingMember[]>> {
  const byGroup = new Map<string, GroupStandingMember[]>();
  if (groupIds.length === 0) {
    return byGroup;
  }

  const [memberRows, gameRows] = await Promise.all([
    database.query.groupMembers.findMany({
      where: inArray(groupMembers.groupId, [...groupIds]),
      columns: { groupId: true, userId: true },
      with: { user: { columns: { name: true } } },
    }),
    database.query.games.findMany({
      where: inArray(games.groupId, [...groupIds]),
      columns: { id: true, groupId: true, cancelledAt: true },
      with: {
        matches: {
          columns: { status: true },
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

  const matchesByGroup = new Map<string, GroupStandingMatch[]>();
  for (const game of gameRows) {
    if (game.groupId === null || game.cancelledAt !== null) {
      continue;
    }
    const list = matchesByGroup.get(game.groupId) ?? [];
    for (const match of game.matches) {
      list.push({
        gameId: game.id,
        status: match.status,
        sets: match.sets,
        slot1UserIds: slotUserIds(match.slot1GameTeam),
        slot2UserIds: slotUserIds(match.slot2GameTeam),
      });
    }
    matchesByGroup.set(game.groupId, list);
  }

  const membersByGroup = new Map<string, typeof memberRows>();
  for (const row of memberRows) {
    const list = membersByGroup.get(row.groupId) ?? [];
    list.push(row);
    membersByGroup.set(row.groupId, list);
  }

  for (const groupId of groupIds) {
    const members = membersByGroup.get(groupId) ?? [];
    const records = groupMemberStandingRecords(
      matchesByGroup.get(groupId) ?? [],
      members.map((row) => row.userId),
    );
    byGroup.set(
      groupId,
      members.map((row) => ({
        userId: row.userId,
        name: row.user.name,
        ...records.get(row.userId)!,
      })),
    );
  }
  return byGroup;
}
