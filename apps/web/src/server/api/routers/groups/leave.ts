import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requireGroup } from "~/server/groups/helpers/require-group";

type DbClient = typeof db;

export async function leaveGroup(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  const group = await requireGroup(database, args.groupId);

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
  });

  if (!membership) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are not a member of this Group",
    });
  }

  await database.delete(groupMembers).where(eq(groupMembers.id, membership.id));

  return {
    ok: true as const,
    groupId: group.id,
    communityId: group.communityId,
  };
}

export const leave = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return leaveGroup(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
    });
  });
