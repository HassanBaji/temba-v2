import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, GroupMemberRoleEnum } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db;

export async function setOrganizer(
  database: DbClient,
  args: {
    groupId: string;
    approverUserId: string;
    userId: string;
    organizer: boolean;
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

  if (group.createdBy === args.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.alwaysOrganizer,
    });
  }
  if (args.organizer && isUnclaimed(membership.user)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.unclaimedOrganizer,
    });
  }

  await database
    .update(groupMembers)
    .set({
      role: args.organizer
        ? GroupMemberRoleEnum.ORGANIZER
        : GroupMemberRoleEnum.MEMBER,
      updatedAt: new Date(),
    })
    .where(eq(groupMembers.id, membership.id));

  return {
    ok: true as const,
    groupId: group.id,
    userId: args.userId,
    organizer: args.organizer,
  };
}

export const setOrganizerProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
      organizer: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setOrganizer(ctx.db, {
      groupId: input.groupId,
      approverUserId: appUser.id,
      userId: input.userId,
      organizer: input.organizer,
      locale: ctx.locale,
    });
  });
