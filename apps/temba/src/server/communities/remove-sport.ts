import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { communitySports, groups, teams } from "@repo/db";

import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function removeSport(
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

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Sport is not on this Community's sports allow-list",
    });
  }

  const clubGroupWithSport = await database.query.groups.findFirst({
    where: and(
      eq(groups.communityId, community.id),
      eq(groups.sport, args.sport),
    ),
  });

  if (clubGroupWithSport) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Cannot remove a sport while a Club Group of that sport exists in this Community",
    });
  }

  const linkedTeamWithSport = await database.query.teams.findFirst({
    where: and(
      eq(teams.communityId, community.id),
      eq(teams.sport, args.sport),
    ),
  });

  if (linkedTeamWithSport) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Cannot remove a sport while a linked Team of that sport exists in this Community",
    });
  }

  await database
    .delete(communitySports)
    .where(eq(communitySports.id, existing.id));

  return {
    ok: true as const,
    communityId: community.id,
    sport: args.sport,
  };
}
