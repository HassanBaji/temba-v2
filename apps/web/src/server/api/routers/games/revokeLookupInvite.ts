import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameMemberInvites } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { revokeLookup } from "~/server/invites/doors";

type DbClient = typeof db;

export async function revokeLookupInvite(
  database: DbClient,
  args: { inviteId: string; userId: string },
) {
  const invite = await database.query.gameMemberInvites.findFirst({
    where: eq(gameMemberInvites.id, args.inviteId),
  });
  if (!invite) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Lookup invite not found",
    });
  }
  const game = await requireGame(database, invite.gameId);
  await assertGameOrganizer(database, game, args.userId);
  if (invite.acceptedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Accepted Lookup invites cannot be revoked",
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
      message: "Accepted Lookup invites cannot be revoked",
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
    });
  });
