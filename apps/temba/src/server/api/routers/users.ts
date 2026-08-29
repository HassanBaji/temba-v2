import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  communityMembers,
  games,
  groupMembers,
  type GroupSportEnum,
} from "@repo/db";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import {
  filterAndSortHomeUpcomingGames,
  gameListTime,
} from "~/server/home/upcoming-games";
import {
  sortStandingMembers,
  standingPosition,
} from "~/server/standing/compare-standing";

export const usersRouter = createTRPCRouter({
  /**
   * Home metrics, upcoming Games, and per-Group standing for the signed-in User.
   * Upcoming Games are membership-scoped only (no public pickup); Soft-archived
   * Club Group Games still appear. Standing position is among that Group's
   * members only — not a global rank.
   */
  home: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser();
    const now = new Date();

    const communityMemberships = await ctx.db.query.communityMembers.findMany({
      where: eq(communityMembers.userId, appUser.id),
      columns: { id: true },
    });

    const myGroupMemberships = await ctx.db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, appUser.id),
      with: {
        group: true,
      },
    });

    const groupIds = myGroupMemberships.map((row) => row.groupId);

    const peerRows =
      groupIds.length === 0
        ? []
        : await ctx.db.query.groupMembers.findMany({
            where: inArray(groupMembers.groupId, groupIds),
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          });

    const peersByGroup = new Map<string, typeof peerRows>();
    for (const row of peerRows) {
      const list = peersByGroup.get(row.groupId) ?? [];
      list.push(row);
      peersByGroup.set(row.groupId, list);
    }

    const standing = myGroupMemberships
      .map((membership) => {
        const peers = peersByGroup.get(membership.groupId) ?? [];
        const sorted = sortStandingMembers(
          peers.map((peer) => ({
            userId: peer.userId,
            totalSetsWon: peer.totalSetsWon,
            totalPointsWon: peer.totalPointsWon,
            totalGamesPlayed: peer.totalGamesPlayed,
            name: peer.user.name,
          })),
        );
        const position = standingPosition(sorted, appUser.id);

        return {
          groupId: membership.group.id,
          groupName: membership.group.name,
          sport: membership.group.sport as GroupSportEnum | null,
          position: position ?? 1,
          memberCount: peers.length,
        };
      })
      .sort((a, b) =>
        (a.groupName ?? "").localeCompare(b.groupName ?? "", undefined, {
          sensitivity: "base",
        }),
      );

    const upcomingGameRows =
      groupIds.length === 0
        ? []
        : await ctx.db.query.games.findMany({
            where: and(
              inArray(games.groupId, groupIds),
              isNull(games.cancelledAt),
            ),
            columns: {
              id: true,
              name: true,
              windowStart: true,
              windowEnd: true,
              cancelledAt: true,
              createdAt: true,
              format: true,
              sport: true,
              groupId: true,
            },
            with: {
              group: {
                columns: {
                  id: true,
                  name: true,
                },
              },
              matches: {
                columns: {
                  startTime: true,
                  status: true,
                },
              },
            },
          });

    const upcomingGames = filterAndSortHomeUpcomingGames(
      upcomingGameRows,
      new Set(groupIds),
      now,
    ).flatMap((game) => {
      if (game.groupId === null) {
        return [];
      }
      return [
        {
          id: game.id,
          name: game.name,
          startTime: gameListTime(game),
          windowStart: game.windowStart,
          windowEnd: game.windowEnd,
          format: game.format,
          sport: game.sport,
          groupId: game.groupId,
          groupName: game.group?.name ?? null,
        },
      ];
    });

    return {
      gamesPlayed: appUser.numberOfGamesPlayed,
      communitiesCount: communityMemberships.length,
      groupsCount: myGroupMemberships.length,
      upcomingGames,
      standing,
    };
  }),
});
