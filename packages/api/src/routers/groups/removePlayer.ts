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

type DbClient = typeof db;

/**
 * A Group approver removing any player. The creator stays. The player's Games
 * stay in history; their Tier points here are cleared and the events that
 * moved them stay in Rating history.
 */
export async function removePlayer(
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

  if (args.userId === args.approverUserId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.removeSelf,
    });
  }
  if (args.userId === group.createdBy) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).group.errors.cannotRemoveCreator,
    });
  }

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
    columns: { id: true },
  });
  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).group.errors.playerNotInGroup,
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

export const removePlayerProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return removePlayer(ctx.db, {
      groupId: input.groupId,
      approverUserId: appUser.id,
      userId: input.userId,
      locale: ctx.locale,
    });
  });
