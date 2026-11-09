import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groupJoinRequests, GroupJoinRequestStatusEnum } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";
import { notifyGroupJoinDecided } from "#src/notifications/notify-requests";

type DbClient = typeof db;

export async function rejectJoinRequest(
  database: DbClient,
  args: { requestId: string; userId: string; block?: boolean },
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

  await assertGroupApprover(database, group, args.userId);

  await database.transaction(async (tx) => {
    const [locked] = await tx
      .select({ status: groupJoinRequests.status })
      .from(groupJoinRequests)
      .where(eq(groupJoinRequests.id, request.id))
      .for("update");
    if (locked?.status !== "pending") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Join request is not pending",
      });
    }
    const [updated] = await tx
      .update(groupJoinRequests)
      .set({
        status: args.block
          ? GroupJoinRequestStatusEnum.BLOCKED
          : GroupJoinRequestStatusEnum.REJECTED,
        decidedBy: args.userId,
        heldGameId: null,
        seatHeldUntil: null,
        heldSeat: null,
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
    await notifyGroupJoinDecided(tx, {
      group,
      requesterUserId: request.userId,
      deciderUserId: args.userId,
      approved: false,
      gameId: request.heldGameId,
    });
  });

  return { ok: true as const };
}

export const rejectJoinRequestProcedure = protectedProcedure
  .input(
    z.object({
      requestId: z.string().uuid(),
      block: z.boolean().optional().default(false),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return rejectJoinRequest(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
      block: input.block,
    });
  });
