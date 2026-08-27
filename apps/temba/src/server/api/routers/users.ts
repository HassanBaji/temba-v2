import { eq, inArray } from "drizzle-orm";

import { communityMembers, groupMembers, type GroupSportEnum } from "@repo/db";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import {
  sortStandingMembers,
  standingPosition,
} from "~/server/standing/compare-standing";

export const usersRouter = createTRPCRouter({
  /**
   * Home metrics and per-Group standing for the signed-in User.
   * Position is among that Group's members only — not a global rank.
   */
  home: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser();

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

    return {
      gamesPlayed: appUser.numberOfGamesPlayed,
      communitiesCount: communityMemberships.length,
      groupsCount: myGroupMemberships.length,
      standing,
    };
  }),
});
