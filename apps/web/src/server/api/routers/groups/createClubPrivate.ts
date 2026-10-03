import { z } from "zod";

import { GroupTypeEnum } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { createClubGroup } from "~/server/groups/helpers/create-club-group";

type DbClient = typeof db;

const sportSchema = z.enum(["padel", "football"]);

export async function createClubPrivate(
  database: DbClient,
  args: {
    communityId: string;
    name: string;
    description?: string;
    sport: "padel" | "football";
    userId: string;
  },
) {
  return createClubGroup({
    database,
    communityId: args.communityId,
    name: args.name,
    description: args.description,
    sport: args.sport,
    type: GroupTypeEnum.PRIVATE,
    createdBy: args.userId,
  });
}

export const createClubPrivateProcedure = protectedProcedure
  .input(
    z.object({
      communityId: z.string().uuid(),
      name: z.string().trim().min(1).max(255),
      description: z.string().trim().max(255).optional(),
      sport: sportSchema,
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createClubPrivate(ctx.db, {
      communityId: input.communityId,
      name: input.name,
      description: input.description,
      sport: input.sport,
      userId: appUser.id,
    });
  });
