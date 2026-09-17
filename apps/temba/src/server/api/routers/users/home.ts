import { eq, inArray } from "drizzle-orm";

import { communityMembers, groupMembers, type GroupSportEnum } from "@repo/db";

import { pendingLookupInvites as pendingCommunityInvites } from "~/server/api/routers/communities/pendingLookupInvites";
import { pendingLookupInvites as pendingGroupInvites } from "~/server/api/routers/groups/pendingLookupInvites";
import { pendingInvites as pendingTeamInvites } from "~/server/api/routers/teams/pendingInvites";
import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { listHomeCarouselGames } from "~/server/home/carousel-games";
import {
  loadCompletedMatchesForUser,
  summarizeCompletedMatchStats,
} from "~/server/stats/completed-matches";
import {
  sortStandingMembers,
  standingPosition,
} from "~/server/standing/compare-standing";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

/**
 * Home metrics, carousel Games, and per-Group standing for the signed-in User.
 * Stats (Played / Won / Lost) are completed Matches the User sat on, including
 * zeros when they have not played. Drawn Matches count as played only. The
 * Home carousel is a dedicated live-Game list (Game admit or Organizer), not
 * the My Games hub filter. Soft-archived Club Group Games still appear when
 * live if the viewer qualifies. Standing position is among that Group's
 * members only — not a global rank, and not a heading on the Level surface.
 */
export async function loadHome(database: DbClient, args: { userId: string }) {
  const now = new Date();

  const [communityMemberships, communityInvites, groupInvites, teamInvites] =
    await Promise.all([
      database.query.communityMembers.findMany({
        where: eq(communityMembers.userId, args.userId),
        columns: { id: true },
      }),
      pendingCommunityInvites(database, { userId: args.userId }),
      pendingGroupInvites(database, { userId: args.userId }),
      pendingTeamInvites(database, { userId: args.userId }),
    ]);

  const pendingInviteCount =
    communityInvites.length + groupInvites.length + teamInvites.length;

  const myGroupMemberships = await database.query.groupMembers.findMany({
    where: eq(groupMembers.userId, args.userId),
    with: {
      group: true,
    },
  });

  const groupIds = myGroupMemberships.map((row) => row.groupId);

  const peerRows =
    groupIds.length === 0
      ? []
      : await database.query.groupMembers.findMany({
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
      const position = standingPosition(sorted, args.userId);

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

  const carouselGames = await listHomeCarouselGames(database, args.userId, now);
  const stats = summarizeCompletedMatchStats(
    await loadCompletedMatchesForUser(database, args.userId),
  );

  return {
    gamesPlayed: stats.gamesPlayed,
    gamesWon: stats.gamesWon,
    gamesLost: stats.gamesLost,
    setsWon: stats.setsWon,
    pendingInviteCount,
    communitiesCount: communityMemberships.length,
    groupsCount: myGroupMemberships.length,
    carouselGames,
    standing,
  };
}

export const home = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return loadHome(ctx.db, { userId: appUser.id });
});
