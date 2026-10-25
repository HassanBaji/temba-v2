import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  groupLinkRequests,
  GroupLinkRequestStatusEnum,
  groups,
} from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export async function declineLinkRequest(
  database: DbClient,
  args: { requestId: string; userId: string },
) {
  const request = await database.query.groupLinkRequests.findFirst({
    where: eq(groupLinkRequests.id, args.requestId),
    columns: { id: true, groupId: true },
  });
  if (!request) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Group link request not found",
    });
  }

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, request.groupId),
    columns: { createdBy: true },
  });
  if (group?.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the Group creator can decide this request",
    });
  }

  const [declined] = await database
    .update(groupLinkRequests)
    .set({
      status: GroupLinkRequestStatusEnum.REJECTED,
      decidedBy: args.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(groupLinkRequests.id, request.id),
        eq(groupLinkRequests.status, GroupLinkRequestStatusEnum.PENDING),
      ),
    )
    .returning({ id: groupLinkRequests.id });
  if (!declined) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Group link request is no longer pending",
    });
  }

  return { ok: true as const, id: declined.id };
}

export const declineLinkRequestProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return declineLinkRequest(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
    });
  });
