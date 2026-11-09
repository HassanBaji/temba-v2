import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, groups } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGroup } from "#src/groups/helpers/require-group";

type DbClient = typeof db;

export async function leaveGroup(
  database: DbClient,
  args: { groupId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const group = await requireGroup(database, args.groupId, locale);

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
  });

  if (!membership) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.notMember,
    });
  }

  if (group.createdBy === args.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.ownerCannotLeave,
    });
  }

  await database.transaction(async (tx) => {
    const [locked] = await tx
      .select({ createdBy: groups.createdBy })
      .from(groups)
      .where(eq(groups.id, group.id))
      .for("share");
    if (locked?.createdBy === args.userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).group.errors.ownerCannotLeave,
      });
    }
    await tx.delete(groupMembers).where(eq(groupMembers.id, membership.id));
  });

  return {
    ok: true as const,
    groupId: group.id,
  };
}

export const leave = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return leaveGroup(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
