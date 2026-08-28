import { TRPCError } from "@trpc/server";
import { and, eq, gt, gte, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityMembers,
  communitySports,
  CommunityRoleEnum,
  games,
  GameStatusEnum,
  groupEmailInvites,
  groupInviteLinks,
  groupMemberInvites,
  groupMembers,
  groups,
  GroupTypeEnum,
  type GroupSportEnum,
} from "@repo/db";

import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { resolveLookupUser } from "~/server/invites/resolve-lookup-user";
import {
  inviteLinkExpiresAt,
  isInviteLinkLive,
} from "~/server/invites/invite-link-expiry";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { type db } from "~/server/db";
import {
  GROUP_GAME_HISTORY_LIMIT,
  GROUP_GAME_HISTORY_STATUSES,
  HOME_UPCOMING_GAME_STATUSES,
} from "~/server/groups/group-games";
import {
  createOpaqueToken,
  getAppOrigin,
  groupInviteLinkUrl,
} from "~/server/invites/tokens";
import {
  sortStandingMembers,
  standingPosition,
} from "~/server/standing/compare-standing";

const sportSchema = z.enum(["padel", "football"]);

type DbClient = typeof db;

function isStaffRole(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

async function requireGroup(database: DbClient, id: string) {
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, id),
  });

  if (!group) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
  }

  return group;
}

async function requireCommunityMembership(
  database: DbClient,
  communityId: string,
  userId: string,
) {
  const membership = await database.query.communityMembers.findFirst({
    where: and(
      eq(communityMembers.communityId, communityId),
      eq(communityMembers.userId, userId),
    ),
  });

  return membership ?? null;
}

async function requireStaff(
  database: DbClient,
  communityId: string,
  userId: string,
  message = "Only Owner or Admin can create a Club Group",
) {
  const membership = await requireCommunityMembership(
    database,
    communityId,
    userId,
  );

  if (!membership || !isStaffRole(membership.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message,
    });
  }

  return membership;
}

async function groupHasGames(database: DbClient, groupId: string) {
  const game = await database.query.games.findFirst({
    where: eq(games.groupId, groupId),
    columns: { id: true },
  });
  return Boolean(game);
}

async function groupHasNonCreatorMembers(
  database: DbClient,
  groupId: string,
  createdBy: string,
) {
  const extra = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      ne(groupMembers.userId, createdBy),
    ),
    columns: { id: true },
  });
  return Boolean(extra);
}

async function mayDeleteEmptyGroup(args: {
  database: DbClient;
  group: typeof groups.$inferSelect;
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

/**
 * Delete a Group that has only the creator and no Games.
 * Club Group: Owner or Admin. Loose Group: creator only.
 * Community is never hard-deleted here.
 */
async function deleteEmptyGroup(args: {
  database: DbClient;
  groupId: string;
  callerId: string;
}) {
  const group = await requireGroup(args.database, args.groupId);

  if (group.communityId) {
    await requireStaff(
      args.database,
      group.communityId,
      args.callerId,
      "Only Owner or Admin can delete a Club Group",
    );
  } else if (group.createdBy !== args.callerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the creator can delete this Group",
    });
  }

  if (await groupHasGames(args.database, group.id)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot delete a Group that has Games",
    });
  }

  if (
    await groupHasNonCreatorMembers(args.database, group.id, group.createdBy)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot delete a Group that has members besides the creator",
    });
  }

  await args.database.transaction(async (tx) => {
    // Email invites and Invite links restrict on group delete — clear first.
    await tx
      .delete(groupEmailInvites)
      .where(eq(groupEmailInvites.groupId, group.id));
    await tx
      .delete(groupInviteLinks)
      .where(eq(groupInviteLinks.groupId, group.id));
    // group_members and group_member_invites cascade from groups.
    await tx.delete(groups).where(eq(groups.id, group.id));
  });

  return {
    ok: true as const,
    groupId: group.id,
    communityId: group.communityId,
  };
}

async function requireLooseCreator(
  database: DbClient,
  groupId: string,
  callerId: string,
) {
  const group = await requireGroup(database, groupId);

  if (group.communityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Group belongs to a Community",
    });
  }

  if (group.createdBy !== callerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the creator can manage invites for this Group",
    });
  }

  return group;
}

async function requireLiveClubCommunity(
  database: DbClient,
  communityId: string,
) {
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, communityId),
  });

  if (!community) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Community not found",
    });
  }

  if (community.archivedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot invite into a Group in an archived Community",
    });
  }

  return community;
}

async function requireGroupLookupSender(
  database: DbClient,
  groupId: string,
  callerId: string,
) {
  const group = await requireGroup(database, groupId);

  if (!group.communityId) {
    await requireLooseCreator(database, groupId, callerId);
    return { group, canAutoAdmit: false as const };
  }

  await requireLiveClubCommunity(database, group.communityId);

  const callerMembership = await requireCommunityMembership(
    database,
    group.communityId,
    callerId,
  );
  const isStaff = isStaffRole(callerMembership?.role);
  const isCreator = group.createdBy === callerId;

  if (!isStaff && !isCreator) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Only Owner, Admin, or this Group's creator can send Lookup invites",
    });
  }

  return { group, canAutoAdmit: isStaff };
}

async function requireGroupInviteLinkMinter(
  database: DbClient,
  groupId: string,
  callerId: string,
) {
  const group = await requireGroup(database, groupId);

  if (!group.communityId) {
    return requireLooseCreator(database, groupId, callerId);
  }

  await requireLiveClubCommunity(database, group.communityId);
  await requireStaff(
    database,
    group.communityId,
    callerId,
    "Only Owner or Admin can mint a Club Group Invite link",
  );

  return group;
}

async function createClubGroup(args: {
  database: DbClient;
  communityId: string;
  name: string;
  description?: string;
  sport: "padel" | "football";
  type: GroupTypeEnum;
  createdBy: string;
}) {
  const community = await args.database.query.communities.findFirst({
    where: eq(communities.id, args.communityId),
  });

  if (!community) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Community not found",
    });
  }

  if (community.archivedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot create a Club Group in an archived Community",
    });
  }

  await requireStaff(args.database, community.id, args.createdBy);

  const allowedSport = await args.database.query.communitySports.findFirst({
    where: and(
      eq(communitySports.communityId, community.id),
      eq(communitySports.sport, args.sport),
    ),
  });

  if (!allowedSport) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Sport is not on this Community's sports allow-list",
    });
  }

  const created = await args.database.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({
        name: args.name,
        description: args.description,
        type: args.type,
        sport: args.sport,
        communityId: community.id,
        createdBy: args.createdBy,
      })
      .returning();

    if (!group) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Club Group",
      });
    }

    await tx.insert(groupMembers).values({
      groupId: group.id,
      userId: args.createdBy,
    });

    return group;
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description,
    type: created.type,
    sport: created.sport as GroupSportEnum,
    communityId: created.communityId,
    createdBy: created.createdBy,
    createdAt: created.createdAt,
  };
}

async function createLooseGroup(args: {
  database: DbClient;
  name: string;
  description?: string;
  sport: "padel" | "football";
  type: GroupTypeEnum;
  createdBy: string;
}) {
  const created = await args.database.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({
        name: args.name,
        description: args.description,
        type: args.type,
        sport: args.sport,
        communityId: null,
        createdBy: args.createdBy,
      })
      .returning();

    if (!group) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Group",
      });
    }

    await tx.insert(groupMembers).values({
      groupId: group.id,
      userId: args.createdBy,
    });

    return group;
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description,
    type: created.type,
    sport: created.sport as GroupSportEnum,
    communityId: created.communityId,
    createdBy: created.createdBy,
    createdAt: created.createdAt,
  };
}

export const groupsRouter = createTRPCRouter({
  createClubPublic: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(255).optional(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      return createClubGroup({
        database: ctx.db,
        communityId: input.communityId,
        name: input.name,
        description: input.description,
        sport: input.sport,
        type: GroupTypeEnum.PUBLIC,
        createdBy: appUser.id,
      });
    }),

  createClubPrivate: protectedProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(255).optional(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      return createClubGroup({
        database: ctx.db,
        communityId: input.communityId,
        name: input.name,
        description: input.description,
        sport: input.sport,
        type: GroupTypeEnum.PRIVATE,
        createdBy: appUser.id,
      });
    }),

  createLoosePublic: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(255).optional(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      return createLooseGroup({
        database: ctx.db,
        name: input.name,
        description: input.description,
        sport: input.sport,
        type: GroupTypeEnum.PUBLIC,
        createdBy: appUser.id,
      });
    }),

  createLoosePrivate: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(255).optional(),
        sport: sportSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      return createLooseGroup({
        database: ctx.db,
        name: input.name,
        description: input.description,
        sport: input.sport,
        type: GroupTypeEnum.PRIVATE,
        createdBy: appUser.id,
      });
    }),

  /** Loose Groups the caller belongs to (Club Groups live under Communities). */
  mineLoose: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser();

    const memberships = await ctx.db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, appUser.id),
      with: {
        group: true,
      },
    });

    return memberships
      .filter((membership) => membership.group.communityId === null)
      .map((membership) => ({
        id: membership.group.id,
        name: membership.group.name,
        description: membership.group.description,
        type: membership.group.type,
        sport: membership.group.sport as GroupSportEnum | null,
      }));
  }),

  /** Groups the caller is a member of (Loose Groups and joined Club Groups). */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser();

    const memberships = await ctx.db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, appUser.id),
      with: {
        group: {
          with: {
            community: true,
          },
        },
      },
    });

    return memberships.map((membership) => {
      const group = membership.group;
      const community = group.community;

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
      };
    });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireGroup(ctx.db, input.id);

      const membership = await ctx.db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, appUser.id),
        ),
      });

      let communityMembership = null;
      let community = null;

      if (group.communityId) {
        community = await ctx.db.query.communities.findFirst({
          where: eq(communities.id, group.communityId),
        });
        communityMembership = await requireCommunityMembership(
          ctx.db,
          group.communityId,
          appUser.id,
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
      const canJoinClubPublic =
        isClubPublic &&
        Boolean(communityMembership) &&
        !membership &&
        !community?.archivedAt;
      const canJoinLoosePublic = isLoosePublic && !membership;
      const canJoin = canJoinClubPublic || canJoinLoosePublic;
      const canManageLookupInvites =
        ((isLoosePublic || isLoosePrivate) && group.createdBy === appUser.id) ||
        ((isClubPublic || isClubPrivate) &&
          !community?.archivedAt &&
          Boolean(communityMembership) &&
          (isStaffRole(communityMembership?.role) ||
            group.createdBy === appUser.id));
      const canManageInviteLinks =
        ((isLoosePublic || isLoosePrivate) && group.createdBy === appUser.id) ||
        ((isClubPublic || isClubPrivate) &&
          !community?.archivedAt &&
          isStaffRole(communityMembership?.role));

      const canDelete = await mayDeleteEmptyGroup({
        database: ctx.db,
        group,
        callerId: appUser.id,
      });

      const memberRows = await ctx.db.query.groupMembers.findMany({
        where: eq(groupMembers.groupId, group.id),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
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
        })),
      );

      const leaderboard = sortedStanding.map((entry, index) => ({
        userId: entry.userId,
        name: entry.name,
        totalSetsWon: entry.totalSetsWon,
        totalPointsWon: entry.totalPointsWon,
        totalGamesPlayed: entry.totalGamesPlayed,
        position: index + 1,
        isViewer: entry.userId === appUser.id,
      }));

      const viewerStandingPosition = membership
        ? standingPosition(sortedStanding, appUser.id)
        : null;

      const now = new Date();

      // Upcoming / history are scoped by this Group id only (excludes null groupId).
      // Soft-archived Communities are not filtered — members still see Games.
      const upcomingGameRows = await ctx.db.query.games.findMany({
        where: and(
          eq(games.groupId, group.id),
          inArray(games.status, [...HOME_UPCOMING_GAME_STATUSES]),
          gte(games.startTime, now),
        ),
        columns: {
          id: true,
          name: true,
          startTime: true,
          endTime: true,
          status: true,
          sport: true,
          groupId: true,
        },
        orderBy: (table, { asc }) => [asc(table.startTime)],
      });

      const historyGameRows = await ctx.db.query.games.findMany({
        where: and(
          eq(games.groupId, group.id),
          or(
            lt(games.startTime, now),
            inArray(games.status, [...GROUP_GAME_HISTORY_STATUSES]),
          ),
        ),
        columns: {
          id: true,
          name: true,
          startTime: true,
          endTime: true,
          status: true,
          sport: true,
          groupId: true,
        },
        orderBy: (table, { desc }) => [desc(table.startTime)],
        limit: GROUP_GAME_HISTORY_LIMIT,
      });

      const upcomingGames = upcomingGameRows.flatMap((game) => {
        if (game.groupId === null) {
          return [];
        }
        return [
          {
            id: game.id,
            name: game.name,
            startTime: game.startTime,
            endTime: game.endTime,
            status: (game.status ?? GameStatusEnum.PENDING) as
              | "pending"
              | "confirmed",
            sport: game.sport,
          },
        ];
      });

      const gameHistory = historyGameRows.flatMap((game) => {
        if (game.groupId === null) {
          return [];
        }
        return [
          {
            id: game.id,
            name: game.name,
            startTime: game.startTime,
            endTime: game.endTime,
            status: game.status,
            sport: game.sport,
          },
        ];
      });

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
        isCommunityArchived: Boolean(community?.archivedAt),
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
        memberUserIds,
        hasInviteLink: canManageInviteLinks,
      };
    }),

  joinClubPublic: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireGroup(ctx.db, input.groupId);

      if (!group.communityId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This is not a Club Group",
        });
      }

      if (group.type !== GroupTypeEnum.PUBLIC) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Club Group Private cannot be joined without an invite",
        });
      }

      const community = await ctx.db.query.communities.findFirst({
        where: eq(communities.id, group.communityId),
      });

      if (!community) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Community not found",
        });
      }

      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot join a Group in an archived Community",
        });
      }

      const communityMembership = await requireCommunityMembership(
        ctx.db,
        group.communityId,
        appUser.id,
      );

      if (!communityMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a Community member to join its Club Groups",
        });
      }

      const existing = await ctx.db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, appUser.id),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this Group",
        });
      }

      const [created] = await ctx.db
        .insert(groupMembers)
        .values({
          groupId: group.id,
          userId: appUser.id,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to join Group",
        });
      }

      return { ok: true as const, groupId: group.id };
    }),

  joinLoosePublic: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireGroup(ctx.db, input.groupId);

      if (group.communityId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Group belongs to a Community",
        });
      }

      if (group.type !== GroupTypeEnum.PUBLIC) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Private Groups cannot be joined via the Group URL",
        });
      }

      const existing = await ctx.db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, appUser.id),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this Group",
        });
      }

      const [created] = await ctx.db
        .insert(groupMembers)
        .values({
          groupId: group.id,
          userId: appUser.id,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to join Group",
        });
      }

      return { ok: true as const, groupId: group.id };
    }),

  leave: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireGroup(ctx.db, input.groupId);

      const membership = await ctx.db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, appUser.id),
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not a member of this Group",
        });
      }

      await ctx.db
        .delete(groupMembers)
        .where(eq(groupMembers.id, membership.id));

      return {
        ok: true as const,
        groupId: group.id,
        communityId: group.communityId,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      return deleteEmptyGroup({
        database: ctx.db,
        groupId: input.groupId,
        callerId: appUser.id,
      });
    }),

  sendLookupInvite: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        query: z.string().trim().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const { group, canAutoAdmit } = await requireGroupLookupSender(
        ctx.db,
        input.groupId,
        appUser.id,
      );
      const invitee = await resolveLookupUser(ctx.db, input.query);

      if (group.communityId && !canAutoAdmit) {
        const inviteeMembership = await requireCommunityMembership(
          ctx.db,
          group.communityId,
          invitee.id,
        );
        if (!inviteeMembership) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invitee must already be a Community Member",
          });
        }
      }

      const existingMember = await ctx.db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, invitee.id),
        ),
      });

      if (existingMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member of this Group",
        });
      }

      const existingInvite = await ctx.db.query.groupMemberInvites.findFirst({
        where: and(
          eq(groupMemberInvites.groupId, group.id),
          eq(groupMemberInvites.userId, invitee.id),
          isNull(groupMemberInvites.acceptedAt),
          isNull(groupMemberInvites.revokedAt),
        ),
      });

      if (existingInvite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An unused Lookup invite already exists for this User",
        });
      }

      const [created] = await ctx.db
        .insert(groupMemberInvites)
        .values({
          groupId: group.id,
          userId: invitee.id,
          invitedBy: appUser.id,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Lookup invite",
        });
      }

      return {
        id: created.id,
        groupId: created.groupId,
        userId: created.userId,
        createdAt: created.createdAt,
      };
    }),

  listLookupInvites: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const { group } = await requireGroupLookupSender(
        ctx.db,
        input.groupId,
        appUser.id,
      );

      const rows = await ctx.db.query.groupMemberInvites.findMany({
        where: and(
          eq(groupMemberInvites.groupId, group.id),
          isNull(groupMemberInvites.acceptedAt),
          isNull(groupMemberInvites.revokedAt),
        ),
        with: {
          user: true,
        },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });

      return rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        user: {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
        },
      }));
    }),

  revokeLookupInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const invite = await ctx.db.query.groupMemberInvites.findFirst({
        where: eq(groupMemberInvites.id, input.inviteId),
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lookup invite not found",
        });
      }

      await requireGroupLookupSender(ctx.db, invite.groupId, appUser.id);

      if (invite.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accepted Lookup invites cannot be revoked",
        });
      }

      if (invite.revokedAt) {
        return { ok: true as const };
      }

      const [updated] = await ctx.db
        .update(groupMemberInvites)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(groupMemberInvites.id, invite.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke Lookup invite",
        });
      }

      return { ok: true as const };
    }),

  pendingLookupInvites: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser();

    const rows = await ctx.db.query.groupMemberInvites.findMany({
      where: and(
        eq(groupMemberInvites.userId, appUser.id),
        isNull(groupMemberInvites.acceptedAt),
        isNull(groupMemberInvites.revokedAt),
      ),
      with: {
        group: true,
        invitedBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    return rows.map((row) => ({
      id: row.id,
      groupId: row.groupId,
      groupName: row.group.name,
      invitedBy: {
        id: row.invitedBy.id,
        name: row.invitedBy.name,
        email: row.invitedBy.email,
      },
      createdAt: row.createdAt,
    }));
  }),

  acceptLookupInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const invite = await ctx.db.query.groupMemberInvites.findFirst({
        where: eq(groupMemberInvites.id, input.inviteId),
      });

      if (!invite || invite.acceptedAt || invite.revokedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lookup invite is not available",
        });
      }

      if (invite.userId !== appUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invite is for a different User",
        });
      }

      const group = await requireGroup(ctx.db, invite.groupId);
      let communityMembership = null;

      if (group.communityId) {
        const community = await ctx.db.query.communities.findFirst({
          where: eq(communities.id, group.communityId),
        });
        if (!community) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Community not found",
          });
        }
        if (community.archivedAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot join a Group in an archived Community",
          });
        }

        communityMembership = await requireCommunityMembership(
          ctx.db,
          group.communityId,
          appUser.id,
        );
        const inviterMembership = await requireCommunityMembership(
          ctx.db,
          group.communityId,
          invite.invitedBy,
        );
        const canAutoAdmit = isStaffRole(inviterMembership?.role);

        if (!communityMembership && !canAutoAdmit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You must be a Community Member to join its Club Groups",
          });
        }
      }

      const existing = await ctx.db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, appUser.id),
        ),
      });

      if (existing) {
        await ctx.db
          .update(groupMemberInvites)
          .set({
            acceptedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(groupMemberInvites.id, invite.id),
              isNull(groupMemberInvites.acceptedAt),
              isNull(groupMemberInvites.revokedAt),
            ),
          );

        return {
          ok: true as const,
          groupId: group.id,
          alreadyMember: true as const,
        };
      }

      await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(groupMemberInvites)
          .set({
            acceptedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(groupMemberInvites.id, invite.id),
              isNull(groupMemberInvites.acceptedAt),
              isNull(groupMemberInvites.revokedAt),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Lookup invite is no longer available",
          });
        }

        if (group.communityId && !communityMembership) {
          await tx.insert(communityMembers).values({
            communityId: group.communityId,
            userId: appUser.id,
            role: CommunityRoleEnum.MEMBER,
          });
        }

        await tx.insert(groupMembers).values({
          groupId: group.id,
          userId: appUser.id,
        });
      });

      return {
        ok: true as const,
        groupId: group.id,
        alreadyMember: false as const,
      };
    }),

  getInviteLink: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireGroupInviteLinkMinter(
        ctx.db,
        input.groupId,
        appUser.id,
      );

      const newest = await ctx.db.query.groupInviteLinks.findFirst({
        where: and(
          eq(groupInviteLinks.groupId, group.id),
          gt(groupInviteLinks.expiresAt, new Date()),
        ),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });

      if (!newest) {
        return null;
      }

      return {
        id: newest.id,
        inviteUrl: groupInviteLinkUrl(getAppOrigin(ctx.headers), newest.token),
        createdAt: newest.createdAt,
        expiresAt: newest.expiresAt,
      };
    }),

  createInviteLink: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireGroupInviteLinkMinter(
        ctx.db,
        input.groupId,
        appUser.id,
      );

      const createdAt = new Date();
      const [created] = await ctx.db
        .insert(groupInviteLinks)
        .values({
          groupId: group.id,
          createdBy: appUser.id,
          token: createOpaqueToken(),
          createdAt,
          expiresAt: inviteLinkExpiresAt(createdAt),
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Invite link",
        });
      }

      return {
        id: created.id,
        inviteUrl: groupInviteLinkUrl(getAppOrigin(ctx.headers), created.token),
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
      };
    }),

  previewInviteLink: publicProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const link = await ctx.db.query.groupInviteLinks.findFirst({
        where: eq(groupInviteLinks.token, input.token),
        with: {
          group: true,
        },
      });

      if (!link || !isInviteLinkLive(link.expiresAt)) {
        return { status: "invalid" as const };
      }

      if (link.group.communityId) {
        const community = await ctx.db.query.communities.findFirst({
          where: eq(communities.id, link.group.communityId),
        });
        if (!community || community.archivedAt) {
          return { status: "unavailable" as const };
        }
      }

      return {
        status: "ready" as const,
        groupName: link.group.name,
      };
    }),

  acceptInviteLink: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const link = await ctx.db.query.groupInviteLinks.findFirst({
        where: eq(groupInviteLinks.token, input.token),
      });

      if (!link || !isInviteLinkLive(link.expiresAt)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite link is not available",
        });
      }

      const group = await requireGroup(ctx.db, link.groupId);

      if (group.communityId) {
        const community = await ctx.db.query.communities.findFirst({
          where: eq(communities.id, group.communityId),
        });
        if (!community) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Community not found",
          });
        }
        if (community.archivedAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot join a Group in an archived Community",
          });
        }
      }

      const existingMembership = await ctx.db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, appUser.id),
        ),
      });

      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this Group",
        });
      }

      const communityMembership = group.communityId
        ? await requireCommunityMembership(
            ctx.db,
            group.communityId,
            appUser.id,
          )
        : null;

      await ctx.db.transaction(async (tx) => {
        if (group.communityId && !communityMembership) {
          await tx.insert(communityMembers).values({
            communityId: group.communityId,
            userId: appUser.id,
            role: CommunityRoleEnum.MEMBER,
          });
        }

        const [inserted] = await tx
          .insert(groupMembers)
          .values({
            groupId: group.id,
            userId: appUser.id,
          })
          .onConflictDoNothing({
            target: [groupMembers.groupId, groupMembers.userId],
          })
          .returning();

        if (!inserted) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You are already a member of this Group",
          });
        }
      });

      return {
        groupId: group.id,
        alreadyMember: false as const,
      };
    }),
});
