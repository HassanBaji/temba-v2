import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  communityJoinRequests,
  CommunityJoinRequestStatusEnum,
  CommunityRoleEnum,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import {
  admit as admitCommunityMember,
  throwAdmitFailure,
} from "~/server/community-membership";
import { type db } from "~/server/db";
import { assertGroupApprover } from "~/server/groups/helpers/is-group-approver";
import { requireGroup } from "~/server/groups/helpers/require-group";
import { consult, refuseIfFrozen } from "~/server/soft-archive";

type DbClient = typeof db;

export async function approveJoinRequest(
  database: DbClient,
  args: { requestId: string; userId: string },
) {
  const request = await database.query.groupJoinRequests.findFirst({
    where: eq(groupJoinRequests.id, args.requestId),
  });

  if (!request) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Join request not found",
    });
  }

  const group = await requireGroup(database, request.groupId);

  if (group.communityId) {
    const archive = await consult(database, { clubGroupId: group.id });
    refuseIfFrozen(archive, "join", {
      frozenMessage:
        "Cannot approve join requests while the Community is archived",
    });
  }

  await assertGroupApprover(database, group, args.userId);

  if (request.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Join request is not pending",
    });
  }

  await database.transaction(async (tx) => {
    if (group.communityId) {
      const admitted = await admitCommunityMember(tx, {
        communityId: group.communityId,
        userId: request.userId,
        role: CommunityRoleEnum.MEMBER,
      });
      if (!admitted.ok && admitted.reason !== "already_member") {
        throwAdmitFailure(admitted);
      }

      const pendingCommunityRequest =
        await tx.query.communityJoinRequests.findFirst({
          where: and(
            eq(communityJoinRequests.communityId, group.communityId),
            eq(communityJoinRequests.userId, request.userId),
            eq(
              communityJoinRequests.status,
              CommunityJoinRequestStatusEnum.PENDING,
            ),
          ),
          columns: { id: true },
        });
      if (pendingCommunityRequest) {
        await tx
          .update(communityJoinRequests)
          .set({
            status: CommunityJoinRequestStatusEnum.APPROVED,
            decidedBy: args.userId,
            updatedAt: new Date(),
          })
          .where(eq(communityJoinRequests.id, pendingCommunityRequest.id));
      }
    }

    const [updated] = await tx
      .update(groupJoinRequests)
      .set({
        status: GroupJoinRequestStatusEnum.APPROVED,
        decidedBy: args.userId,
        updatedAt: new Date(),
      })
      .where(eq(groupJoinRequests.id, request.id))
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to approve join request",
      });
    }

    const existing = await tx.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.userId, request.userId),
      ),
      columns: { id: true },
    });
    if (!existing) {
      await tx.insert(groupMembers).values({
        groupId: group.id,
        userId: request.userId,
      });
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
