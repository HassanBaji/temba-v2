import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupJoinRequests, GroupJoinRequestStatusEnum } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { groupJoinMode } from "#src/groups/helpers/group-join-mode";
import { requireGroup } from "#src/groups/helpers/require-group";
import { notifyGroupJoinRequested } from "#src/notifications/notify-requests";

type DbClient = typeof db;

export async function requestJoin(
  database: DbClient,
  args: { groupId: string; userId: string; note?: string | null },
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

  const details = {
    note: args.note ?? null,
    source: "group_page" as const,
    invitedBy: null,
  };

  return database.transaction(async (tx) => {
    const [request] =
      existing?.status === "rejected" || existing?.status === "approved"
        ? await tx
            .update(groupJoinRequests)
            .set({
              status: GroupJoinRequestStatusEnum.PENDING,
              decidedBy: null,
              ...details,
              updatedAt: new Date(),
            })
            .where(eq(groupJoinRequests.id, existing.id))
            .returning()
        : await tx
            .insert(groupJoinRequests)
            .values({
              groupId: group.id,
              userId: args.userId,
              status: GroupJoinRequestStatusEnum.PENDING,
              ...details,
            })
            .returning();

    if (!request) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create join request",
      });
    }
    await notifyGroupJoinRequested(tx, {
      group,
      requesterUserId: args.userId,
    });
    return { id: request.id, status: "pending" as const };
  });
}

export const requestJoinProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      note: z
        .string()
        .trim()
        .max(280)
        .optional()
        .transform((note) => (note === undefined || note === "" ? null : note)),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return requestJoin(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
      note: input.note,
    });
  });
