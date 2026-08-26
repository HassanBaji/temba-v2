import { TRPCError } from "@trpc/server";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityMembers,
  communitySports,
  games,
  groupEmailInvites,
  groupInviteLinks,
  groupMemberInvites,
  groupMembers,
  groups,
  GroupTypeEnum,
  user,
  type GroupSportEnum,
} from "@repo/db";

import { resolveAppUser } from "~/server/auth/resolve-app-user";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { type db } from "~/server/db";
import {
  createOpaqueToken,
  getAppOrigin,
  groupEmailInviteUrl,
  groupInviteLinkUrl,
  normalizeInviteEmail,
} from "~/server/invites/tokens";
import { sendGroupEmailInviteMail } from "~/server/mail/send-group-email-invite";

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
      message: "Only the creator can delete a Loose Group",
    });
  }

  if (await groupHasGames(args.database, group.id)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot delete a Group that has Games",
    });
  }

  if (
    await groupHasNonCreatorMembers(
      args.database,
      group.id,
      group.createdBy,
    )
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

function mayInviteClubPrivate(args: {
  groupCreatedBy: string;
  communityRole: string | null | undefined;
  callerId: string;
}) {
  return (
    isStaffRole(args.communityRole) || args.groupCreatedBy === args.callerId
  );
}

async function requireLoosePrivateCreator(
  database: DbClient,
  groupId: string,
  callerId: string,
) {
  const group = await requireGroup(database, groupId);

  if (group.communityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This is not a Loose Group",
    });
  }

  if (group.type !== GroupTypeEnum.PRIVATE) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Loose Group Public has no Email invite or Invite link",
    });
  }

  if (group.createdBy !== callerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the creator can manage Loose Group Private invites",
    });
  }

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
        message: "Failed to create Loose Group",
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
      const canInviteClubPrivate =
        isClubPrivate &&
        !community?.archivedAt &&
        Boolean(communityMembership) &&
        mayInviteClubPrivate({
          groupCreatedBy: group.createdBy,
          communityRole: communityMembership?.role,
          callerId: appUser.id,
        });
      const canManageInvites =
        isLoosePrivate && group.createdBy === appUser.id;

      const canDelete = await mayDeleteEmptyGroup({
        database: ctx.db,
        group,
        callerId: appUser.id,
      });

      const pendingInvite = isClubPrivate
        ? await ctx.db.query.groupMemberInvites.findFirst({
            where: and(
              eq(groupMemberInvites.groupId, group.id),
              eq(groupMemberInvites.userId, appUser.id),
              isNull(groupMemberInvites.acceptedAt),
              isNull(groupMemberInvites.revokedAt),
            ),
          })
        : null;

      const canAcceptClubPrivateInvite =
        isClubPrivate &&
        Boolean(pendingInvite) &&
        Boolean(communityMembership) &&
        !membership &&
        !community?.archivedAt;

      let memberUserIds: string[] = [];
      if (canInviteClubPrivate) {
        const members = await ctx.db.query.groupMembers.findMany({
          where: eq(groupMembers.groupId, group.id),
          columns: { userId: true },
        });
        memberUserIds = members.map((row) => row.userId);
      }

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        type: group.type,
        sport: group.sport as GroupSportEnum | null,
        communityId: group.communityId,
        isLoose: !group.communityId,
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
        membership: membership ? { id: membership.id } : null,
        communityMembership: communityMembership
          ? { role: communityMembership.role }
          : null,
        canJoin,
        canJoinLoosePublic,
        canJoinClubPublic,
        canInviteClubPrivate,
        canAcceptClubPrivateInvite,
        canManageInvites,
        canDelete,
        pendingInvite: pendingInvite
          ? { id: pendingInvite.id, createdAt: pendingInvite.createdAt }
          : null,
        memberUserIds,
        hasEmailInvite: canManageInvites,
        hasInviteLink: canManageInvites,
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
          message: "This is not a Loose Group",
        });
      }

      if (group.type !== GroupTypeEnum.PUBLIC) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Loose Group Private cannot be joined via the Group URL",
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

  inviteClubPrivate: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        userId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireGroup(ctx.db, input.groupId);

      if (!group.communityId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only Club Groups support in-app member invites",
        });
      }

      if (group.type !== GroupTypeEnum.PRIVATE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Club Group Public does not use in-app invites",
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
          message: "Cannot invite into a Group in an archived Community",
        });
      }

      const callerMembership = await requireCommunityMembership(
        ctx.db,
        group.communityId,
        appUser.id,
      );

      if (
        !callerMembership ||
        !mayInviteClubPrivate({
          groupCreatedBy: group.createdBy,
          communityRole: callerMembership.role,
          callerId: appUser.id,
        })
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only Owner, Admin, or this Group's creator can invite into a Club Group Private",
        });
      }

      const inviteeMembership = await requireCommunityMembership(
        ctx.db,
        group.communityId,
        input.userId,
      );

      if (!inviteeMembership) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitee must already be a Community member",
        });
      }

      const existingMember = await ctx.db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, input.userId),
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
          eq(groupMemberInvites.userId, input.userId),
          isNull(groupMemberInvites.acceptedAt),
          isNull(groupMemberInvites.revokedAt),
        ),
      });

      if (existingInvite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An unused invite already exists for this member",
        });
      }

      const [created] = await ctx.db
        .insert(groupMemberInvites)
        .values({
          groupId: group.id,
          userId: input.userId,
          invitedBy: appUser.id,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Group invite",
        });
      }

      return {
        id: created.id,
        groupId: created.groupId,
        userId: created.userId,
        createdAt: created.createdAt,
      };
    }),

  listClubPrivateInvites: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireGroup(ctx.db, input.groupId);

      if (!group.communityId || group.type !== GroupTypeEnum.PRIVATE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "In-app invites only apply to Club Group Private",
        });
      }

      const callerMembership = await requireCommunityMembership(
        ctx.db,
        group.communityId,
        appUser.id,
      );

      if (
        !callerMembership ||
        !mayInviteClubPrivate({
          groupCreatedBy: group.createdBy,
          communityRole: callerMembership.role,
          callerId: appUser.id,
        })
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Owner, Admin, or this Group's creator can list invites",
        });
      }

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

  revokeClubPrivateInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const invite = await ctx.db.query.groupMemberInvites.findFirst({
        where: eq(groupMemberInvites.id, input.inviteId),
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group invite not found",
        });
      }

      const group = await requireGroup(ctx.db, invite.groupId);

      if (!group.communityId || group.type !== GroupTypeEnum.PRIVATE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "In-app invites only apply to Club Group Private",
        });
      }

      const callerMembership = await requireCommunityMembership(
        ctx.db,
        group.communityId,
        appUser.id,
      );

      if (
        !callerMembership ||
        !mayInviteClubPrivate({
          groupCreatedBy: group.createdBy,
          communityRole: callerMembership.role,
          callerId: appUser.id,
        })
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only Owner, Admin, or this Group's creator can revoke invites",
        });
      }

      if (invite.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accepted invites cannot be revoked",
        });
      }

      if (invite.revokedAt) {
        return { ok: true as const };
      }

      await ctx.db
        .update(groupMemberInvites)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(groupMemberInvites.id, invite.id));

      return { ok: true as const };
    }),

  acceptClubPrivateInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const invite = await ctx.db.query.groupMemberInvites.findFirst({
        where: eq(groupMemberInvites.id, input.inviteId),
      });

      if (!invite || invite.acceptedAt || invite.revokedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group invite is not available",
        });
      }

      if (invite.userId !== appUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invite is for a different User",
        });
      }

      const group = await requireGroup(ctx.db, invite.groupId);

      if (!group.communityId || group.type !== GroupTypeEnum.PRIVATE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "In-app invites only apply to Club Group Private",
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
            message: "Group invite is no longer available",
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

  sendEmailInvite: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        email: z.string().trim().email().max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireLoosePrivateCreator(
        ctx.db,
        input.groupId,
        appUser.id,
      );

      const email = normalizeInviteEmail(input.email);
      const existingInvite = await ctx.db.query.groupEmailInvites.findFirst({
        where: and(
          eq(groupEmailInvites.groupId, group.id),
          eq(groupEmailInvites.email, email),
          isNull(groupEmailInvites.acceptedAt),
          isNull(groupEmailInvites.revokedAt),
        ),
      });

      if (existingInvite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An unused Email invite already exists for this address",
        });
      }

      const attachedUser = await ctx.db.query.user.findFirst({
        where: eq(user.email, email),
      });

      const token = createOpaqueToken();
      const [created] = await ctx.db
        .insert(groupEmailInvites)
        .values({
          groupId: group.id,
          email,
          userId: attachedUser?.id,
          invitedBy: appUser.id,
          token,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Email invite",
        });
      }

      const inviteUrl = groupEmailInviteUrl(
        getAppOrigin(ctx.headers),
        created.token,
      );

      await sendGroupEmailInviteMail({
        to: email,
        groupName: group.name ?? "Group",
        inviteUrl,
      });

      return {
        id: created.id,
        email: created.email,
        inviteUrl,
        attachedUserId: created.userId,
      };
    }),

  listEmailInvites: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireLoosePrivateCreator(
        ctx.db,
        input.groupId,
        appUser.id,
      );

      const rows = await ctx.db.query.groupEmailInvites.findMany({
        where: and(
          eq(groupEmailInvites.groupId, group.id),
          isNull(groupEmailInvites.acceptedAt),
          isNull(groupEmailInvites.revokedAt),
        ),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });

      const origin = getAppOrigin(ctx.headers);

      return rows.map((row) => ({
        id: row.id,
        email: row.email,
        attachedUserId: row.userId,
        inviteUrl: groupEmailInviteUrl(origin, row.token),
        createdAt: row.createdAt,
      }));
    }),

  revokeEmailInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const invite = await ctx.db.query.groupEmailInvites.findFirst({
        where: eq(groupEmailInvites.id, input.inviteId),
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email invite not found",
        });
      }

      await requireLoosePrivateCreator(ctx.db, invite.groupId, appUser.id);

      if (invite.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accepted Email invites cannot be revoked",
        });
      }

      if (invite.revokedAt) {
        return { ok: true as const };
      }

      const [updated] = await ctx.db
        .update(groupEmailInvites)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(groupEmailInvites.id, invite.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke Email invite",
        });
      }

      return { ok: true as const };
    }),

  getInviteLink: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireLoosePrivateCreator(
        ctx.db,
        input.groupId,
        appUser.id,
      );

      const active = await ctx.db.query.groupInviteLinks.findFirst({
        where: and(
          eq(groupInviteLinks.groupId, group.id),
          isNull(groupInviteLinks.revokedAt),
        ),
      });

      if (!active) {
        return null;
      }

      return {
        id: active.id,
        inviteUrl: groupInviteLinkUrl(
          getAppOrigin(ctx.headers),
          active.token,
        ),
        createdAt: active.createdAt,
      };
    }),

  createInviteLink: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireLoosePrivateCreator(
        ctx.db,
        input.groupId,
        appUser.id,
      );

      const existing = await ctx.db.query.groupInviteLinks.findFirst({
        where: and(
          eq(groupInviteLinks.groupId, group.id),
          isNull(groupInviteLinks.revokedAt),
        ),
      });

      if (existing) {
        return {
          id: existing.id,
          inviteUrl: groupInviteLinkUrl(
            getAppOrigin(ctx.headers),
            existing.token,
          ),
          createdAt: existing.createdAt,
        };
      }

      const [created] = await ctx.db
        .insert(groupInviteLinks)
        .values({
          groupId: group.id,
          createdBy: appUser.id,
          token: createOpaqueToken(),
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
        inviteUrl: groupInviteLinkUrl(
          getAppOrigin(ctx.headers),
          created.token,
        ),
        createdAt: created.createdAt,
      };
    }),

  rotateInviteLink: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireLoosePrivateCreator(
        ctx.db,
        input.groupId,
        appUser.id,
      );

      const created = await ctx.db.transaction(async (tx) => {
        const active = await tx.query.groupInviteLinks.findFirst({
          where: and(
            eq(groupInviteLinks.groupId, group.id),
            isNull(groupInviteLinks.revokedAt),
          ),
        });

        if (active) {
          await tx
            .update(groupInviteLinks)
            .set({
              revokedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(groupInviteLinks.id, active.id));
        }

        const [next] = await tx
          .insert(groupInviteLinks)
          .values({
            groupId: group.id,
            createdBy: appUser.id,
            token: createOpaqueToken(),
          })
          .returning();

        if (!next) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to rotate Invite link",
          });
        }

        return next;
      });

      return {
        id: created.id,
        inviteUrl: groupInviteLinkUrl(
          getAppOrigin(ctx.headers),
          created.token,
        ),
        createdAt: created.createdAt,
      };
    }),

  revokeInviteLink: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const group = await requireLoosePrivateCreator(
        ctx.db,
        input.groupId,
        appUser.id,
      );

      const active = await ctx.db.query.groupInviteLinks.findFirst({
        where: and(
          eq(groupInviteLinks.groupId, group.id),
          isNull(groupInviteLinks.revokedAt),
        ),
      });

      if (!active) {
        return { ok: true as const };
      }

      await ctx.db
        .update(groupInviteLinks)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(groupInviteLinks.id, active.id));

      return { ok: true as const };
    }),

  previewEmailInvite: publicProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.query.groupEmailInvites.findFirst({
        where: eq(groupEmailInvites.token, input.token),
        with: {
          group: true,
        },
      });

      if (!invite || invite.acceptedAt || invite.revokedAt) {
        return { status: "invalid" as const };
      }

      if (invite.group.communityId || invite.group.type !== "private") {
        return { status: "unavailable" as const };
      }

      return {
        status: "ready" as const,
        groupName: invite.group.name,
        invitedEmail: invite.email,
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

      if (!link || link.revokedAt) {
        return { status: "invalid" as const };
      }

      if (link.group.communityId || link.group.type !== "private") {
        return { status: "unavailable" as const };
      }

      return {
        status: "ready" as const,
        groupName: link.group.name,
      };
    }),

  acceptEmailInvite: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const invite = await ctx.db.query.groupEmailInvites.findFirst({
        where: eq(groupEmailInvites.token, input.token),
      });

      if (!invite || invite.acceptedAt || invite.revokedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email invite is not available",
        });
      }

      const group = await requireGroup(ctx.db, invite.groupId);

      if (group.communityId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Email invite is not for a Loose Group",
        });
      }

      if (group.type !== GroupTypeEnum.PRIVATE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Loose Group Public has no Email invite",
        });
      }

      if (normalizeInviteEmail(appUser.email) !== invite.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Signed-in email does not match this Email invite. The invite was not consumed.",
        });
      }

      const existingMembership = await ctx.db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, appUser.id),
        ),
      });

      if (existingMembership) {
        if (!invite.acceptedAt) {
          await ctx.db
            .update(groupEmailInvites)
            .set({
              acceptedAt: new Date(),
              userId: appUser.id,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(groupEmailInvites.id, invite.id),
                isNull(groupEmailInvites.acceptedAt),
                isNull(groupEmailInvites.revokedAt),
              ),
            );
        }

        return {
          groupId: group.id,
          alreadyMember: true as const,
        };
      }

      await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(groupEmailInvites)
          .set({
            acceptedAt: new Date(),
            userId: appUser.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(groupEmailInvites.id, invite.id),
              isNull(groupEmailInvites.acceptedAt),
              isNull(groupEmailInvites.revokedAt),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email invite is no longer available",
          });
        }

        await tx.insert(groupMembers).values({
          groupId: group.id,
          userId: appUser.id,
        });
      });

      return {
        groupId: group.id,
        alreadyMember: false as const,
      };
    }),

  acceptInviteLink: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const link = await ctx.db.query.groupInviteLinks.findFirst({
        where: eq(groupInviteLinks.token, input.token),
      });

      if (!link || link.revokedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite link is not available",
        });
      }

      const group = await requireGroup(ctx.db, link.groupId);

      if (group.communityId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Invite link is not for a Loose Group",
        });
      }

      if (group.type !== GroupTypeEnum.PRIVATE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Loose Group Public has no Invite link",
        });
      }

      const existingMembership = await ctx.db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, appUser.id),
        ),
      });

      if (existingMembership) {
        return {
          groupId: group.id,
          alreadyMember: true as const,
        };
      }

      await ctx.db.insert(groupMembers).values({
        groupId: group.id,
        userId: appUser.id,
      });

      return {
        groupId: group.id,
        alreadyMember: false as const,
      };
    }),
});
