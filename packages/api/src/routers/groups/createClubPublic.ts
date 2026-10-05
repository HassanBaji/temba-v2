import { z } from "zod";

import { GroupTypeEnum } from "@repo/db";
import { sportSchema } from "@repo/validators/sport";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { createClubGroup } from "#src/groups/helpers/create-club-group";

type DbClient = typeof db;

export async function createClubPublic(
  database: DbClient,
  args: {
    communityId: string;
    name: string;
    description?: string;
    sport: "padel" | "football";
    userId: string;
    requiresApproval?: boolean;
  },
) {
  return createClubGroup({
    database,
    communityId: args.communityId,
    name: args.name,
    description: args.description,
    sport: args.sport,
    type: GroupTypeEnum.PUBLIC,
    createdBy: args.userId,
    requiresApproval: args.requiresApproval,
  });
}

export const createClubPublicProcedure = protectedProcedure
  .input(
    z.object({
      communityId: z.string().uuid(),
      name: z.string().trim().min(1).max(255),
      description: z.string().trim().max(255).optional(),
      sport: sportSchema,
      requiresApproval: z.boolean().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createClubPublic(ctx.db, {
      communityId: input.communityId,
      name: input.name,
      description: input.description,
      sport: input.sport,
      userId: appUser.id,
      requiresApproval: input.requiresApproval,
    });
  });
