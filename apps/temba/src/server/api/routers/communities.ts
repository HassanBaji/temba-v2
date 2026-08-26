import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityJoinRequests,
  communityMembers,
  communitySports,
  CommunityJoinRequestStatusEnum,
  CommunityRoleEnum,
  CommunityTypeEnum,
  type GroupSportEnum,
} from "@repo/db";

import { type db } from "~/server/db";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const sportSchema = z.enum(["padel", "football"]);
const communityTypeSchema = z.enum(["public", "private"]);

type DbClient = typeof db;
type CommunityRole = "owner" | "admin" | "member";
type JoinRequestStatus = "pending" | "approved" | "rejected";

function isStaffRole(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

function asRole(role: string): CommunityRole {
  return role as CommunityRole;
}

function asJoinStatus(status: string): JoinRequestStatus {
  return status as JoinRequestStatus;
}

async function requireCommunity(database: DbClient, id: string) {
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, id),
  });

  if (!community) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Community not found" });
  }

  return community;
}

async function requireMembership(
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
  const membership = await requireMembership(database, communityId, userId);

  if (!membership || !isStaffRole(membership.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Owner or Admin can manage join requests",
    });
  }

  return membership;
}

export const communitiesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(255).optional(),
        type: communityTypeSchema,
        sports: z.array(sportSchema).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const uniqueSports = [...new Set(input.sports)];
      if (uniqueSports.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one sport is required",
        });
      }

      const appUser = await resolveAppUser();

      const community = await ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(communities)
          .values({
            name: input.name,
            description: input.description,
            type: input.type,
            createdBy: appUser.id,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create community",
          });
        }

        await tx.insert(communityMembers).values({
          communityId: created.id,
          userId: appUser.id,
          role: CommunityRoleEnum.OWNER,
        });

        await tx.insert(communitySports).values(
          uniqueSports.map((sport) => ({
            communityId: created.id,
            sport,
          })),
        );

        return created;
      });

      return community;
    }),

  directory: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser();

    const rows = await ctx.db.query.communities.findMany({
      where: and(
        eq(communities.type, CommunityTypeEnum.PUBLIC),
        isNull(communities.archivedAt),
      ),
      with: {
        sports: true,
      },
      orderBy: (table, { asc }) => [asc(table.name)],
    });

    const memberships = await ctx.db.query.communityMembers.findMany({
      where: eq(communityMembers.userId, appUser.id),
    });
    const membershipByCommunity = new Map(
      memberships.map((row) => [row.communityId, row]),
    );

    const joinRequests = await ctx.db.query.communityJoinRequests.findMany({
      where: eq(communityJoinRequests.userId, appUser.id),
    });
    const joinRequestByCommunity = new Map(
      joinRequests.map((row) => [row.communityId, row]),
    );

    return rows.map((row) => {
      const membership = membershipByCommunity.get(row.id);
      const joinRequest = joinRequestByCommunity.get(row.id);

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        sports: row.sports.map((sportRow) => sportRow.sport as GroupSportEnum),
        createdAt: row.createdAt,
        membership: membership ? { role: asRole(membership.role) } : null,
        joinRequest: joinRequest
          ? {
              id: joinRequest.id,
              status: asJoinStatus(joinRequest.status),
            }
          : null,
      };
    });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const community = await ctx.db.query.communities.findFirst({
        where: eq(communities.id, input.id),
        with: {
          sports: true,
        },
      });

      if (!community) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const membership = await requireMembership(
        ctx.db,
        community.id,
        appUser.id,
      );

      const joinRequest = await ctx.db.query.communityJoinRequests.findFirst({
        where: and(
          eq(communityJoinRequests.communityId, community.id),
          eq(communityJoinRequests.userId, appUser.id),
        ),
      });

      const canManageJoinRequests =
        community.type === "public" && isStaffRole(membership?.role);

      return {
        id: community.id,
        name: community.name,
        description: community.description,
        type: community.type,
        archivedAt: community.archivedAt,
        createdAt: community.createdAt,
        sports: community.sports.map(
          (sportRow) => sportRow.sport as GroupSportEnum,
        ),
        membership: membership ? { role: asRole(membership.role) } : null,
        joinRequest: joinRequest
          ? {
              id: joinRequest.id,
              status: asJoinStatus(joinRequest.status),
            }
          : null,
        canManageJoinRequests,
        groups: [] as const,
      };
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser();

    const memberships = await ctx.db.query.communityMembers.findMany({
      where: eq(communityMembers.userId, appUser.id),
      with: {
        community: {
          with: {
            sports: true,
          },
        },
      },
    });

    return memberships.map((membership) => ({
      id: membership.community.id,
      name: membership.community.name,
      description: membership.community.description,
      type: membership.community.type,
      role: asRole(membership.role),
      sports: membership.community.sports.map(
        (sportRow) => sportRow.sport as GroupSportEnum,
      ),
      archivedAt: membership.community.archivedAt,
    }));
  }),

  requestJoin: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);

      if (community.type !== "public") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Community Private has no request-to-join path",
        });
      }

      if (community.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot request to join an archived Community",
        });
      }

      const membership = await requireMembership(
        ctx.db,
        community.id,
        appUser.id,
      );
      if (membership) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already a member of this Community",
        });
      }

      const existing = await ctx.db.query.communityJoinRequests.findFirst({
        where: and(
          eq(communityJoinRequests.communityId, community.id),
          eq(communityJoinRequests.userId, appUser.id),
        ),
      });

      if (existing?.status === "pending") {
        return {
          id: existing.id,
          status: asJoinStatus(existing.status),
        };
      }

      if (existing?.status === "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join request was already approved",
        });
      }

      if (existing?.status === "rejected") {
        const [updated] = await ctx.db
          .update(communityJoinRequests)
          .set({
            status: CommunityJoinRequestStatusEnum.PENDING,
            decidedBy: null,
            updatedAt: new Date(),
          })
          .where(eq(communityJoinRequests.id, existing.id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to re-request join",
          });
        }

        return {
          id: updated.id,
          status: asJoinStatus(updated.status),
        };
      }

      const [created] = await ctx.db
        .insert(communityJoinRequests)
        .values({
          communityId: community.id,
          userId: appUser.id,
          status: CommunityJoinRequestStatusEnum.PENDING,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create join request",
        });
      }

      return {
        id: created.id,
        status: asJoinStatus(created.status),
      };
    }),

  listJoinRequests: protectedProcedure
    .input(z.object({ communityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();
      const community = await requireCommunity(ctx.db, input.communityId);

      if (community.type !== "public") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join requests only apply to Community Public",
        });
      }

      await requireStaff(ctx.db, community.id, appUser.id);

      const rows = await ctx.db.query.communityJoinRequests.findMany({
        where: and(
          eq(communityJoinRequests.communityId, community.id),
          eq(
            communityJoinRequests.status,
            CommunityJoinRequestStatusEnum.PENDING,
          ),
        ),
        with: {
          user: true,
        },
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      });

      return rows.map((row) => ({
        id: row.id,
        status: asJoinStatus(row.status),
        createdAt: row.createdAt,
        user: {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
        },
      }));
    }),

  approveJoinRequest: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const request = await ctx.db.query.communityJoinRequests.findFirst({
        where: eq(communityJoinRequests.id, input.requestId),
      });

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Join request not found",
        });
      }

      const community = await requireCommunity(ctx.db, request.communityId);

      if (community.type !== "public") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join requests only apply to Community Public",
        });
      }

      await requireStaff(ctx.db, community.id, appUser.id);

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join request is not pending",
        });
      }

      await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(communityJoinRequests)
          .set({
            status: CommunityJoinRequestStatusEnum.APPROVED,
            decidedBy: appUser.id,
            updatedAt: new Date(),
          })
          .where(eq(communityJoinRequests.id, request.id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to approve join request",
          });
        }

        const existingMembership = await tx.query.communityMembers.findFirst({
          where: and(
            eq(communityMembers.communityId, community.id),
            eq(communityMembers.userId, request.userId),
          ),
        });

        if (!existingMembership) {
          await tx.insert(communityMembers).values({
            communityId: community.id,
            userId: request.userId,
            role: CommunityRoleEnum.MEMBER,
          });
        }
      });

      return { ok: true as const };
    }),

  rejectJoinRequest: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser();

      const request = await ctx.db.query.communityJoinRequests.findFirst({
        where: eq(communityJoinRequests.id, input.requestId),
      });

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Join request not found",
        });
      }

      const community = await requireCommunity(ctx.db, request.communityId);

      if (community.type !== "public") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join requests only apply to Community Public",
        });
      }

      await requireStaff(ctx.db, community.id, appUser.id);

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Join request is not pending",
        });
      }

      const [updated] = await ctx.db
        .update(communityJoinRequests)
        .set({
          status: CommunityJoinRequestStatusEnum.REJECTED,
          decidedBy: appUser.id,
          updatedAt: new Date(),
        })
        .where(eq(communityJoinRequests.id, request.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reject join request",
        });
      }

      return { ok: true as const };
    }),
});
