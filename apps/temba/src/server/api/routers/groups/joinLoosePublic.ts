import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, GroupTypeEnum } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requireGroup } from "~/server/groups/helpers/require-group";

type DbClient = typeof db;

export async function joinLoosePublic(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  const group = await requireGroup(database, args.groupId);

  if (group.communityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Group belongs to a Community",
    });
  }

  if (group.type !== GroupTypeEnum.PUBLIC) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Private Groups cannot be joined via the Group URL",
    });
  }

  const existing = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already a member of this Group",
    });
  }

  const [created] = await database
    .insert(groupMembers)
    .values({
      groupId: group.id,
      userId: args.userId,
    })
    .returning();

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to join Group",
    });
  }

  return { ok: true as const, groupId: group.id };
}

export const joinLoosePublicProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return joinLoosePublic(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
    });
  });
