import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupJoinRequests, GroupJoinRequestStatusEnum } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { groupJoinMode } from "~/server/groups/helpers/group-join-mode";
import { requireGroup } from "~/server/groups/helpers/require-group";

type DbClient = typeof db;

export async function requestJoin(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  const group = await requireGroup(database, args.groupId);
  const mode = await groupJoinMode(database, group, args.userId);

  if (mode === "requested") {
    const existing = await database.query.groupJoinRequests.findFirst({
      where: and(
        eq(groupJoinRequests.groupId, group.id),
        eq(groupJoinRequests.userId, args.userId),
        eq(groupJoinRequests.status, GroupJoinRequestStatusEnum.PENDING),
      ),
    });
    if (!existing) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to load join request",
      });
    }
    return { id: existing.id, status: "pending" as const };
  }

  if (mode !== "request") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You cannot request to join this Group",
    });
  }

  const existing = await database.query.groupJoinRequests.findFirst({
    where: and(
      eq(groupJoinRequests.groupId, group.id),
      eq(groupJoinRequests.userId, args.userId),
    ),
  });

  if (existing?.status === "rejected" || existing?.status === "approved") {
    const [updated] = await database
      .update(groupJoinRequests)
      .set({
        status: GroupJoinRequestStatusEnum.PENDING,
        decidedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(groupJoinRequests.id, existing.id))
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to re-request join",
      });
    }

    return { id: updated.id, status: "pending" as const };
  }

  const [created] = await database
    .insert(groupJoinRequests)
    .values({
      groupId: group.id,
      userId: args.userId,
      status: GroupJoinRequestStatusEnum.PENDING,
    })
    .returning();

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create join request",
    });
  }

  return { id: created.id, status: "pending" as const };
}

export const requestJoinProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return requestJoin(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
    });
  });
