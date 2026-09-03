import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  communityJoinRequests,
  CommunityJoinRequestStatusEnum,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { asJoinStatus } from "~/server/communities/helpers/as-join-status";
import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireMembership } from "~/server/communities/helpers/require-membership";
import { type db } from "~/server/db";
import { consult, refuseIfFrozen } from "~/server/soft-archive";

type DbClient = typeof db;

export async function requestJoin(
  database: DbClient,
  args: { communityId: string; userId: string },
) {
  const community = await requireCommunity(database, args.communityId);

  if (community.type !== "public") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Community Private has no request-to-join path",
    });
  }

  refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "join", {
    frozenMessage: "Cannot request to join an archived Community",
  });

  const membership = await requireMembership(
    database,
    community.id,
    args.userId,
  );
  if (membership) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are already a member of this Community",
    });
  }

  const existing = await database.query.communityJoinRequests.findFirst({
    where: and(
      eq(communityJoinRequests.communityId, community.id),
      eq(communityJoinRequests.userId, args.userId),
    ),
  });

  if (existing?.status === "pending") {
    return {
      id: existing.id,
      status: asJoinStatus(existing.status),
    };
  }

  // Non-members may re-request after leave (approved leftover) or reject.
  if (existing?.status === "rejected" || existing?.status === "approved") {
    const [updated] = await database
      .update(communityJoinRequests)
      .set({
        status: CommunityJoinRequestStatusEnum.PENDING,
        decidedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(communityJoinRequests.id, existing.id))
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to re-request join",
      });
    }

    return {
      id: updated.id,
      status: asJoinStatus(updated.status),
    };
  }

  const [created] = await database
    .insert(communityJoinRequests)
    .values({
      communityId: community.id,
      userId: args.userId,
      status: CommunityJoinRequestStatusEnum.PENDING,
    })
    .returning();

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create join request",
    });
  }

  return {
    id: created.id,
    status: asJoinStatus(created.status),
  };
}

export const requestJoinProcedure = protectedProcedure
  .input(z.object({ communityId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return requestJoin(ctx.db, {
      communityId: input.communityId,
      userId: appUser.id,
    });
  });
