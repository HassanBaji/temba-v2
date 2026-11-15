import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groupMemberInvites } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGroup } from "#src/groups/helpers/require-group";
import { acceptLookup, throwInviteFrozen } from "#src/invites/doors";

type DbClient = typeof db;

export async function acceptLookupInvite(
  database: DbClient,
  args: { inviteId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const invite = await database.query.groupMemberInvites.findFirst({
    where: eq(groupMemberInvites.id, args.inviteId),
  });

  if (!invite || invite.acceptedAt || invite.revokedAt) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).invite.errors.lookupUnavailable,
    });
  }

  if (invite.userId !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).invite.errors.differentUser,
    });
  }

  const group = await requireGroup(database, invite.groupId, locale);
  const accepted = await database.transaction((tx) =>
    acceptLookup(
      tx,
      { kind: "group", id: group.id },
      {
        inviteId: invite.id,
        userId: args.userId,
        locale: args.locale ?? DEFAULT_LOCALE,
      },
    ),
  );
  if (!accepted.ok) {
    if (accepted.reason === "frozen") {
      throwInviteFrozen(
        { kind: "group", id: group.id },
        "accept",
        "frozen",
        locale,
      );
    }
    if (accepted.reason === "wrong_user") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).invite.errors.differentUser,
      });
    }
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).invite.errors.lookupUnavailable,
    });
  }

  return {
    ok: true as const,
    groupId: group.id,
    alreadyMember: accepted.alreadyMember,
  };
}

export const acceptLookupInviteProcedure = protectedProcedure
  .input(z.object({ inviteId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return acceptLookupInvite(ctx.db, {
      inviteId: input.inviteId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
