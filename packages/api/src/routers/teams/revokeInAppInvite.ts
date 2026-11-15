import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { teamMemberInvites } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { revokeLookup } from "#src/invites/doors";
import { requireTeam } from "#src/teams/helpers/require-team";

type DbClient = typeof db;

export async function revokeInAppInvite(
  database: DbClient,
  args: { inviteId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const invite = await database.query.teamMemberInvites.findFirst({
    where: eq(teamMemberInvites.id, args.inviteId),
  });

  if (!invite) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).team.errors.inviteNotFound,
    });
  }

  const team = await requireTeam(database, invite.teamId, locale);

  if (team.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).team.errors.creatorRevokesInvites,
    });
  }

  if (invite.acceptedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).team.errors.acceptedNoRevoke,
    });
  }

  if (invite.revokedAt) {
    return { ok: true as const };
  }

  const revoked = await revokeLookup(
    database,
    { kind: "team", id: team.id },
    invite.id,
  );
  if (!revoked.ok && revoked.reason === "already_accepted") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).team.errors.acceptedNoRevoke,
    });
  }
  if (!revoked.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to revoke Team invite",
    });
  }

  return { ok: true as const };
}

export const revokeInAppInviteProcedure = protectedProcedure
  .input(z.object({ inviteId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return revokeInAppInvite(ctx.db, {
      inviteId: input.inviteId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
