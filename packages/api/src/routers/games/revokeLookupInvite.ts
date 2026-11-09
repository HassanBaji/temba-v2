import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameMemberInvites } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { revokeLookup } from "#src/invites/doors";

type DbClient = typeof db;

export async function revokeLookupInvite(
  database: DbClient,
  args: { inviteId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const invite = await database.query.gameMemberInvites.findFirst({
    where: eq(gameMemberInvites.id, args.inviteId),
  });
  if (!invite) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).invite.errors.lookupNotFound,
    });
  }
  const game = await requireGame(database, invite.gameId, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  if (invite.acceptedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).invite.errors.lookupAcceptedNoRevoke,
    });
  }
  if (invite.revokedAt) {
    return { ok: true as const };
  }
  const revoked = await revokeLookup(
    database,
    { kind: "game", id: game.id },
    invite.id,
  );
  if (!revoked.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).invite.errors.lookupAcceptedNoRevoke,
    });
  }
  return { ok: true as const };
}

export const revokeLookupInviteProcedure = protectedProcedure
  .input(z.object({ inviteId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return revokeLookupInvite(ctx.db, {
      inviteId: input.inviteId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
