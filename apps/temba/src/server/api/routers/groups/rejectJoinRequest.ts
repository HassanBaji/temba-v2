import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groupJoinRequests, GroupJoinRequestStatusEnum } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGroupApprover } from "~/server/groups/helpers/is-group-approver";
import { requireGroup } from "~/server/groups/helpers/require-group";
import { consult, refuseIfFrozen } from "~/server/soft-archive";

type DbClient = typeof db;

export async function rejectJoinRequest(
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
        "Cannot reject join requests while the Community is archived",
    });
  }

  await assertGroupApprover(database, group, args.userId);

  if (request.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Join request is not pending",
    });
  }

  const [updated] = await database
    .update(groupJoinRequests)
    .set({
      status: GroupJoinRequestStatusEnum.REJECTED,
      decidedBy: args.userId,
      updatedAt: new Date(),
    })
    .where(eq(groupJoinRequests.id, request.id))
    .returning();

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to reject join request",
    });
  }

  return { ok: true as const };
}

export const rejectJoinRequestProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return rejectJoinRequest(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
    });
  });
