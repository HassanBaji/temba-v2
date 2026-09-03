import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  games,
  groupMembers,
  GroupTypeEnum,
  type GroupSportEnum,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { isStaffRole, mayCreateGameOnGroup } from "~/server/games/access";
import { groupHasGames } from "~/server/groups/helpers/group-has-games";
import { groupHasNonCreatorMembers } from "~/server/groups/helpers/group-has-non-creator-members";
import { requireCommunityMembership } from "~/server/groups/helpers/require-community-membership";
import { requireGroup } from "~/server/groups/helpers/require-group";
import {
  filterAndSortHomeUpcomingGames,
  gameListTime,
  isGameLive,
} from "~/server/home/upcoming-games";
import { consult } from "~/server/soft-archive";
import {
  sortStandingMembers,
  standingPosition,
} from "~/server/standing/compare-standing";

type DbClient = typeof db;

const GROUP_GAME_HISTORY_LIMIT = 20;

async function mayDeleteEmptyGroup(args: {
  database: DbClient;
  group: Awaited<ReturnType<typeof requireGroup>>;
  callerId: string;
}) {
  if (args.group.communityId) {
    const membership = await requireCommunityMembership(
      args.database,
      args.group.communityId,
      args.callerId,
    );
    if (!membership || !isStaffRole(membership.role)) {
      return false;
    }
  } else if (args.group.createdBy !== args.callerId) {
    return false;
  }

  if (await groupHasGames(args.database, args.group.id)) {
    return false;
  }

  if (
    await groupHasNonCreatorMembers(
      args.database,
      args.group.id,
      args.group.createdBy,
    )
  ) {
    return false;
  }

  return true;
}

export async function groupById(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  const group = await requireGroup(database, args.groupId);

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
  });

  let communityMembership = null;
  let community = null;

  if (group.communityId) {
    community = await database.query.communities.findFirst({
      where: eq(communities.id, group.communityId),
    });
    communityMembership = await requireCommunityMembership(
      database,
      group.communityId,
      args.userId,
    );
  }

  const isLoosePublic =
    !group.communityId && group.type === GroupTypeEnum.PUBLIC;
  const isLoosePrivate =
    !group.communityId && group.type === GroupTypeEnum.PRIVATE;
  const isClubPublic =
    Boolean(group.communityId) && group.type === GroupTypeEnum.PUBLIC;
  const isClubPrivate =
    Boolean(group.communityId) && group.type === GroupTypeEnum.PRIVATE;
  const archive = consult({
    archivedAt: community?.archivedAt ?? null,
  });
  const live = !archive.freeze("join");
  const canJoinClubPublic =
    isClubPublic && Boolean(communityMembership) && !membership && live;
  const canJoinLoosePublic = isLoosePublic && !membership;
  const canJoin = canJoinClubPublic || canJoinLoosePublic;
  const canManageLookupInvites =
    ((isLoosePublic || isLoosePrivate) && group.createdBy === args.userId) ||
    ((isClubPublic || isClubPrivate) &&
      !archive.freeze("host") &&
      Boolean(communityMembership) &&
      (isStaffRole(communityMembership?.role) ||
        group.createdBy === args.userId));
  const canManageInviteLinks =
    ((isLoosePublic || isLoosePrivate) && group.createdBy === args.userId) ||
    ((isClubPublic || isClubPrivate) &&
      !archive.freeze("host") &&
      isStaffRole(communityMembership?.role));

  const canDelete = await mayDeleteEmptyGroup({
    database,
    group,
    callerId: args.userId,
  });
  const canCreateGame = await mayCreateGameOnGroup(
    database,
    group,
    args.userId,
  );

  const memberRows = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, group.id),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  const memberUserIds = memberRows.map((row) => row.userId);

  const sortedStanding = sortStandingMembers(
    memberRows.map((row) => ({
      userId: row.userId,
      totalSetsWon: row.totalSetsWon,
      totalPointsWon: row.totalPointsWon,
      totalGamesPlayed: row.totalGamesPlayed,
      name: row.user.name,
      image: row.user.image,
    })),
  );

  const leaderboard = sortedStanding.map((entry, index) => ({
    userId: entry.userId,
    name: entry.name,
    image: entry.image,
    totalSetsWon: entry.totalSetsWon,
    totalPointsWon: entry.totalPointsWon,
    totalGamesPlayed: entry.totalGamesPlayed,
    position: index + 1,
    isViewer: entry.userId === args.userId,
  }));

  const viewerStandingPosition = membership
    ? standingPosition(sortedStanding, args.userId)
    : null;

  const now = new Date();

  // Upcoming / history are scoped by this Group id only (excludes null groupId).
  // Soft-archived Communities are not filtered — members still see Games.
  const groupGameRows = await database.query.games.findMany({
    where: eq(games.groupId, group.id),
    columns: {
      id: true,
      name: true,
      windowStart: true,
      windowEnd: true,
      pricePerPlayerCents: true,
      levelMinTenths: true,
      levelMaxTenths: true,
      cancelledAt: true,
      createdAt: true,
      format: true,
      sport: true,
      groupId: true,
    },
    with: {
      matches: {
        columns: {
          startTime: true,
          status: true,
        },
      },
    },
  });

  const upcomingGames = filterAndSortHomeUpcomingGames(
    groupGameRows,
    new Set([group.id]),
    now,
  ).map((game) => ({
    id: game.id,
    name: game.name,
    startTime: gameListTime(game),
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    pricePerPlayerCents: game.pricePerPlayerCents,
    levelMinTenths: game.levelMinTenths,
    levelMaxTenths: game.levelMaxTenths,
    format: game.format,
    cancelledAt: game.cancelledAt,
    sport: game.sport,
  }));

  const gameHistory = groupGameRows
    .filter((game) => {
      if (game.groupId === null || game.groupId !== group.id) {
        return false;
      }
      return !isGameLive(game, now);
    })
    .sort((a, b) => gameListTime(b).getTime() - gameListTime(a).getTime())
    .slice(0, GROUP_GAME_HISTORY_LIMIT)
    .map((game) => ({
      id: game.id,
      name: game.name,
      startTime: gameListTime(game),
      windowStart: game.windowStart,
      windowEnd: game.windowEnd,
      pricePerPlayerCents: game.pricePerPlayerCents,
      levelMinTenths: game.levelMinTenths,
      levelMaxTenths: game.levelMaxTenths,
      format: game.format,
      cancelledAt: game.cancelledAt,
      sport: game.sport,
    }));

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    type: group.type,
    sport: group.sport as GroupSportEnum | null,
    communityId: group.communityId,
    isLoose: !group.communityId,
    totalGamesPlayed: group.totalGamesPlayed,
    community: community
      ? {
          id: community.id,
          name: community.name,
          archivedAt: community.archivedAt,
        }
      : null,
    isCommunityArchived:
      consult({ archivedAt: community?.archivedAt ?? null }).phase ===
      "archived",
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    membership: membership
      ? {
          id: membership.id,
          totalGamesPlayed: membership.totalGamesPlayed,
          totalSetsWon: membership.totalSetsWon,
          totalPointsWon: membership.totalPointsWon,
          standingPosition: viewerStandingPosition,
        }
      : null,
    standing: {
      memberCount: memberRows.length,
      leaderboard,
    },
    upcomingGames,
    gameHistory,
    communityMembership: communityMembership
      ? { role: communityMembership.role }
      : null,
    canJoin,
    canJoinLoosePublic,
    canJoinClubPublic,
    canManageLookupInvites,
    canManageInviteLinks,
    canDelete,
    canCreateGame,
    memberUserIds,
    hasInviteLink: canManageInviteLinks,
  };
}

export const byId = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return groupById(ctx.db, { groupId: input.id, userId: appUser.id });
  });
