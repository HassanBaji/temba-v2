import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityMembers,
  communitySports,
  groupMembers,
  groups,
  GroupTypeEnum,
  type GroupSportEnum,
} from "@repo/db";

import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";

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
) {
  const membership = await requireCommunityMembership(
    database,
    communityId,
    userId,
  );

  if (!membership || !isStaffRole(membership.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Owner or Admin can create a Club Group",
    });
  }

  return membership;
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

      const community = await ctx.db.query.communities.findFirst({
        where: eq(communities.id, input.communityId),
      });

      if (!community) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Community not found",
        });
      }

      await requireStaff(ctx.db, community.id, appUser.id);

      const allowedSport = await ctx.db.query.communitySports.findFirst({
        where: and(
          eq(communitySports.communityId, community.id),
          eq(communitySports.sport, input.sport),
        ),
      });

      if (!allowedSport) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sport is not on this Community's sports allow-list",
        });
      }

      const created = await ctx.db.transaction(async (tx) => {
        const [group] = await tx
          .insert(groups)
          .values({
            name: input.name,
            description: input.description,
            type: GroupTypeEnum.PUBLIC,
            sport: input.sport,
            communityId: community.id,
            createdBy: appUser.id,
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
          userId: appUser.id,
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

      const isClubPublic =
        Boolean(group.communityId) && group.type === GroupTypeEnum.PUBLIC;
      const canJoin =
        isClubPublic &&
        Boolean(communityMembership) &&
        !membership &&
        !community?.archivedAt;

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        type: group.type,
        sport: group.sport as GroupSportEnum | null,
        communityId: group.communityId,
        community: community
          ? {
              id: community.id,
              name: community.name,
              archivedAt: community.archivedAt,
            }
          : null,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
        membership: membership ? { id: membership.id } : null,
        communityMembership: communityMembership
          ? { role: communityMembership.role }
          : null,
        canJoin,
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
});
