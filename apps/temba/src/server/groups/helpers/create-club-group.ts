import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import {
  communities,
  communitySports,
  groupMembers,
  groups,
  type GroupSportEnum,
  type GroupTypeEnum,
} from "@repo/db";

import { requireStaff } from "~/server/groups/helpers/require-staff";
import { consult, refuseIfFrozen } from "~/server/soft-archive";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function createClubGroup(args: {
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

  refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "host", {
    frozenMessage: "Cannot create a Club Group in an archived Community",
  });

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
