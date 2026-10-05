import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { communityMemberInvites } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { requireLiveCommunity } from "#src/communities/helpers/require-live-community";
import { requireStaff } from "#src/communities/helpers/require-staff";
import { type db } from "#src/db";
import { revokeLookup } from "#src/invites/doors";

type DbClient = typeof db;

export async function revokeLookupInvite(
  database: DbClient,
  args: { inviteId: string; userId: string },
) {
  const invite = await database.query.communityMemberInvites.findFirst({
    where: eq(communityMemberInvites.id, args.inviteId),
  });

  if (!invite) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Lookup invite not found",
    });
  }

  const community = await requireLiveCommunity(database, invite.communityId);
  await requireStaff(database, community.id, args.userId);

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
    { kind: "community", id: community.id },
    invite.id,
  );
  if (!revoked.ok && revoked.reason === "already_accepted") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Accepted Lookup invites cannot be revoked",
    });
  }
  if (!revoked.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to revoke Lookup invite",
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
