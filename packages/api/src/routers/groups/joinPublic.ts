import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isBlockedFromGroup } from "#src/groups/helpers/is-blocked-from-group";
import { requireGroup } from "#src/groups/helpers/require-group";
import { notifyGroupJoined } from "#src/notifications/notify-group-joined";

type DbClient = typeof db;

export async function joinPublic(
  database: DbClient,
  args: { groupId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const group = await requireGroup(database, args.groupId, locale);

  if (group.type !== "public") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.privateNoUrlJoin,
    });
  }

  if (await isBlockedFromGroup(database, group.id, args.userId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).group.errors.cannotJoin,
    });
  }

  if (group.requiresApproval) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.requiresApproval,
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
      message: messagesFor(locale).group.errors.alreadyMember,
    });
  }

  await database.transaction(async (tx) => {
    const [created] = await tx
      .insert(groupMembers)
      .values({
        groupId: group.id,
        userId: args.userId,
      })
      .onConflictDoNothing({
        target: [groupMembers.groupId, groupMembers.userId],
      })
      .returning();

    if (!created) {
      throw new TRPCError({
        code: "CONFLICT",
        message: messagesFor(locale).group.errors.alreadyMember,
      });
    }

    await notifyGroupJoined(tx, { group, joinerUserId: args.userId });
  });

  return { ok: true as const, groupId: group.id };
}

export const joinPublicProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return joinPublic(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
