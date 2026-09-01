import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import {
  communityJoinRequests,
  CommunityJoinRequestStatusEnum,
} from "@repo/db";

import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { consult, refuseIfFrozen } from "~/server/soft-archive";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function rejectJoinRequest(
  database: DbClient,
  args: { requestId: string; userId: string },
) {
  const request = await database.query.communityJoinRequests.findFirst({
    where: eq(communityJoinRequests.id, args.requestId),
  });

  if (!request) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Join request not found",
    });
  }

  const community = await requireCommunity(database, request.communityId);

  if (community.type !== "public") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Join requests only apply to Community Public",
    });
  }

  refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "join", {
    frozenMessage: "Cannot reject join requests for an archived Community",
  });

  await requireStaff(database, community.id, args.userId);

  if (request.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Join request is not pending",
    });
  }

  const [updated] = await database
    .update(communityJoinRequests)
    .set({
      status: CommunityJoinRequestStatusEnum.REJECTED,
      decidedBy: args.userId,
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
}
