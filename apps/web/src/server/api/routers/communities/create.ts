import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { communities, communitySports, CommunityRoleEnum } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import {
  admit as admitCommunityMember,
  throwAdmitFailure,
} from "~/server/community-membership";
import { type db } from "~/server/db";

type DbClient = typeof db;

const sportSchema = z.enum(["padel", "football"]);
const communityTypeSchema = z.enum(["public", "private"]);

export async function createCommunity(
  database: DbClient,
  args: {
    name: string;
    description?: string;
    type: "public" | "private";
    sports: ("padel" | "football")[];
    userId: string;
  },
) {
  const uniqueSports = [...new Set(args.sports)];
  if (uniqueSports.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "At least one sport is required",
    });
  }

  return database.transaction(async (tx) => {
    const [created] = await tx
      .insert(communities)
      .values({
        name: args.name,
        description: args.description,
        type: args.type,
        createdBy: args.userId,
      })
      .returning();

    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create community",
      });
    }

    throwAdmitFailure(
      await admitCommunityMember(tx, {
        communityId: created.id,
        userId: args.userId,
        role: CommunityRoleEnum.OWNER,
      }),
    );

    await tx.insert(communitySports).values(
      uniqueSports.map((sport) => ({
        communityId: created.id,
        sport,
      })),
    );

    return created;
  });
}

export const create = protectedProcedure
  .input(
    z.object({
      name: z.string().trim().min(1).max(255),
      description: z.string().trim().max(255).optional(),
      type: communityTypeSchema,
      sports: z.array(sportSchema).min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createCommunity(ctx.db, {
      name: input.name,
      description: input.description,
      type: input.type,
      sports: input.sports,
      userId: appUser.id,
    });
  });
