import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityMembers,
  communitySports,
  CommunityRoleEnum,
  CommunityTypeEnum,
  type GroupSportEnum,
} from "@repo/db";

import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const sportSchema = z.enum(["padel", "football"]);
const communityTypeSchema = z.enum(["public", "private"]);

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
    await resolveAppUser();

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

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      sports: row.sports.map((sportRow) => sportRow.sport as GroupSportEnum),
      createdAt: row.createdAt,
    }));
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

      const membership = await ctx.db.query.communityMembers.findFirst({
        where: and(
          eq(communityMembers.communityId, community.id),
          eq(communityMembers.userId, appUser.id),
        ),
      });

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
        membership: membership
          ? { role: membership.role as CommunityRoleEnum }
          : null,
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
      role: membership.role as CommunityRoleEnum,
      sports: membership.community.sports.map(
        (sportRow) => sportRow.sport as GroupSportEnum,
      ),
      archivedAt: membership.community.archivedAt,
    }));
  }),
});
