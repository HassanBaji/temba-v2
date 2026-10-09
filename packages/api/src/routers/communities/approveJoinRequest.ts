import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  communityJoinRequests,
  CommunityJoinRequestStatusEnum,
  CommunityRoleEnum,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  admit as admitCommunityMember,
  throwAdmitFailure,
} from "#src/community-membership";
import { requireCommunity } from "#src/communities/helpers/require-community";
import { requireStaff } from "#src/communities/helpers/require-staff";
import { type db } from "#src/db";
import { consult, refuseIfFrozen } from "#src/soft-archive";

type DbClient = typeof db;

export async function approveJoinRequest(
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
    frozenMessage: "Cannot approve join requests for an archived Community",
  });

  await requireStaff(database, community.id, args.userId);

  if (request.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Join request is not pending",
    });
  }

  await database.transaction(async (tx) => {
    const [updated] = await tx
      .update(communityJoinRequests)
      .set({
        status: CommunityJoinRequestStatusEnum.APPROVED,
        decidedBy: args.userId,
        updatedAt: new Date(),
      })
      .where(eq(communityJoinRequests.id, request.id))
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to approve join request",
      });
    }

    const admitted = await admitCommunityMember(tx, {
      communityId: community.id,
      userId: request.userId,
      role: CommunityRoleEnum.MEMBER,
    });
    if (!admitted.ok && admitted.reason !== "already_member") {
      throwAdmitFailure(admitted);
    }
  });

  return { ok: true as const };
}

export const approveJoinRequestProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return approveJoinRequest(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
    });
  });
