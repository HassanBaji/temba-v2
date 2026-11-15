import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { acceptLink, throwInviteFrozen } from "#src/invites/doors";

type DbClient = typeof db;

export async function acceptInviteLink(
  database: DbClient,
  args: { token: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const accepted = await database.transaction((tx) =>
    acceptLink(tx, "group", {
      token: args.token,
      userId: args.userId,
      locale: args.locale ?? DEFAULT_LOCALE,
    }),
  );
  if (!accepted.ok) {
    if (accepted.reason === "already_member") {
      throw new TRPCError({
        code: "CONFLICT",
        message: messagesFor(locale).group.errors.alreadyMember,
      });
    }
    if (accepted.reason === "blocked") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).group.errors.cannotJoin,
      });
    }
    if (accepted.reason === "frozen") {
      throwInviteFrozen({ kind: "group", id: "" }, "accept", "frozen", locale);
    }
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).invite.errors.linkUnavailable,
    });
  }

  return {
    groupId: accepted.hostId,
    alreadyMember: accepted.alreadyMember,
    requested: accepted.requested ?? false,
  };
}

export const acceptInviteLinkProcedure = protectedProcedure
  .input(z.object({ token: z.string().min(1).max(64) }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return acceptInviteLink(ctx.db, {
      token: input.token,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
