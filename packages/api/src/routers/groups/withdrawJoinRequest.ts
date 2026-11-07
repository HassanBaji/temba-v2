import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groupJoinRequests } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";

type DbClient = typeof db;

/** The requester takes their own pending join request back, Seat hold included. */
export async function withdrawJoinRequest(
  database: DbClient,
  args: { requestId: string; userId: string },
) {
  const request = await database.query.groupJoinRequests.findFirst({
    where: eq(groupJoinRequests.id, args.requestId),
    columns: { id: true, userId: true, status: true, groupId: true },
  });
  if (request?.userId !== args.userId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Join request not found",
    });
  }
  if (request.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Join request is not pending",
    });
  }
  await database
    .delete(groupJoinRequests)
    .where(eq(groupJoinRequests.id, request.id));
  return { ok: true as const, groupId: request.groupId };
}

export const withdrawJoinRequestProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return withdrawJoinRequest(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
    });
  });
