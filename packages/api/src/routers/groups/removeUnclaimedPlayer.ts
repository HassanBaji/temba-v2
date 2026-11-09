import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db;

export async function removeUnclaimedPlayer(
  database: DbClient,
  args: { groupId: string; approverUserId: string; userId: string },
) {
  const group = await requireGroup(database, args.groupId);
  await assertGroupApprover(database, group, args.approverUserId);

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
    columns: { id: true },
    with: { user: { columns: { clerkId: true, addedAt: true } } },
  });
  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This player is not in the Group",
    });
  }
  if (!isUnclaimed(membership.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only players not on Temba yet can be removed",
    });
  }

  await database.delete(groupMembers).where(eq(groupMembers.id, membership.id));

  return { ok: true as const, groupId: group.id, userId: args.userId };
}

export const removeUnclaimedPlayerProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return removeUnclaimedPlayer(ctx.db, {
      groupId: input.groupId,
      approverUserId: appUser.id,
      userId: input.userId,
    });
  });
