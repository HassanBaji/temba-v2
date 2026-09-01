import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import {
  communityJoinRequests,
  CommunityJoinRequestStatusEnum,
} from "@repo/db";

import { asJoinStatus } from "~/server/communities/helpers/as-join-status";
import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { type JoinRequest } from "~/server/communities/utils";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function listJoinRequests(
  database: DbClient,
  args: { communityId: string; userId: string },
): Promise<JoinRequest[]> {
  const community = await requireCommunity(database, args.communityId);

  if (community.type !== "public") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Join requests only apply to Community Public",
    });
  }

  await requireStaff(database, community.id, args.userId);

  const rows = await database.query.communityJoinRequests.findMany({
    where: and(
      eq(communityJoinRequests.communityId, community.id),
      eq(communityJoinRequests.status, CommunityJoinRequestStatusEnum.PENDING),
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
}
