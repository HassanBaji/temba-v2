import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { communitySports, type GroupSportEnum } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { type db } from "~/server/db";

type DbClient = typeof db;

const sportSchema = z.enum(["padel", "football"]);

export async function addSport(
  database: DbClient,
  args: {
    communityId: string;
    userId: string;
    sport: "padel" | "football";
  },
) {
  const community = await requireCommunity(database, args.communityId);

  await requireStaff(database, community.id, args.userId);

  const existing = await database.query.communitySports.findFirst({
    where: and(
      eq(communitySports.communityId, community.id),
      eq(communitySports.sport, args.sport),
    ),
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Sport is already on this Community's sports allow-list",
    });
  }

  const [created] = await database
    .insert(communitySports)
    .values({
      communityId: community.id,
      sport: args.sport,
    })
    .returning();

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to add sport",
    });
  }

  return {
    ok: true as const,
    communityId: community.id,
    sport: created.sport as GroupSportEnum,
  };
}

export const addSportProcedure = protectedProcedure
  .input(
    z.object({
      communityId: z.string().uuid(),
      sport: sportSchema,
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addSport(ctx.db, {
      communityId: input.communityId,
      userId: appUser.id,
      sport: input.sport,
    });
  });
