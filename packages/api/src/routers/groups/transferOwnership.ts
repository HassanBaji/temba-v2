import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, GroupMemberRoleEnum, groups } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGroupOwner } from "#src/groups/helpers/group-owner";
import { requireGroup } from "#src/groups/helpers/require-group";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db;

/**
 * Hand the Group to another member. The new owner becomes the creator for
 * every door that reads `createdBy`; the previous owner stays a member and is
 * made an Appointed Organizer so they keep running Games.
 */
export async function transferOwnership(
  database: DbClient,
  args: {
    groupId: string;
    userId: string;
    newOwnerUserId: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const group = await requireGroup(database, args.groupId, locale);
  assertGroupOwner(
    group,
    args.userId,
    messagesFor(locale).group.errors.transferOwnerOnly,
  );

  if (args.newOwnerUserId === group.createdBy) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.alreadyOwner,
    });
  }

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.newOwnerUserId),
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
  if (isUnclaimed(membership.user)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.unclaimedOwner,
    });
  }

  const now = new Date();
  const previousOwnerId = group.createdBy;
  await database.transaction(async (tx) => {
    const [locked] = await tx
      .select({ createdBy: groups.createdBy })
      .from(groups)
      .where(eq(groups.id, group.id))
      .for("update");
    if (locked?.createdBy !== args.userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).group.errors.transferOwnerOnly,
      });
    }
    const [stillMember] = await tx
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(eq(groupMembers.id, membership.id))
      .for("update");
    if (!stillMember) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).group.errors.playerNotInGroup,
      });
    }
    await tx
      .update(groups)
      .set({ createdBy: args.newOwnerUserId, updatedAt: now })
      .where(eq(groups.id, group.id));
    await tx
      .update(groupMembers)
      .set({ role: GroupMemberRoleEnum.ORGANIZER, updatedAt: now })
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, previousOwnerId),
        ),
      );
  });

  return {
    ok: true as const,
    groupId: group.id,
    previousOwnerId,
    newOwnerId: args.newOwnerUserId,
  };
}

export const transferOwnershipProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return transferOwnership(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
      newOwnerUserId: input.userId,
      locale: ctx.locale,
    });
  });
