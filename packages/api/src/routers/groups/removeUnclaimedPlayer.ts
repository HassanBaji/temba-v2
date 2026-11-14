import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, groupTierPoints } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db;

export async function removeUnclaimedPlayer(
  database: DbClient,
  args: {
    groupId: string;
    approverUserId: string;
    userId: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const group = await requireGroup(database, args.groupId, locale);
  await assertGroupApprover(database, group, args.approverUserId, locale);

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
      message: messagesFor(locale).group.errors.playerNotInGroup,
    });
  }
  if (!isUnclaimed(membership.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).group.errors.onlyUnclaimedRemovable,
    });
  }

  await database.transaction(async (tx) => {
    await tx.delete(groupMembers).where(eq(groupMembers.id, membership.id));
    await tx
      .delete(groupTierPoints)
      .where(
        and(
          eq(groupTierPoints.groupId, group.id),
          eq(groupTierPoints.userId, args.userId),
        ),
      );
  });

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
      locale: ctx.locale,
    });
  });
