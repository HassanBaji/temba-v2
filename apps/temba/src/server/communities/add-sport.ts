import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { communitySports, type GroupSportEnum } from "@repo/db";

import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { type db } from "~/server/db";

type DbClient = typeof db;

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
