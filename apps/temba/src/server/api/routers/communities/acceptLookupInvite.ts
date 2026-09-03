import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { communityMemberInvites } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { requireCommunity } from "~/server/communities/helpers/require-community";
import { type db } from "~/server/db";
import { acceptLookup, throwInviteFrozen } from "~/server/invites/doors";

type DbClient = typeof db;

export async function acceptLookupInvite(
  database: DbClient,
  args: { inviteId: string; userId: string },
) {
  const invite = await database.query.communityMemberInvites.findFirst({
    where: eq(communityMemberInvites.id, args.inviteId),
  });

  if (!invite || invite.acceptedAt || invite.revokedAt) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Lookup invite is not available",
    });
  }

  if (invite.userId !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This invite is for a different User",
    });
  }

  const community = await requireCommunity(database, invite.communityId);
  const accepted = await acceptLookup(
    database,
    { kind: "community", id: community.id },
    { inviteId: invite.id, userId: args.userId },
  );
  if (!accepted.ok) {
    if (accepted.reason === "frozen" || accepted.reason === "not_found") {
      throwInviteFrozen(
        { kind: "community", id: community.id },
        "accept",
        accepted.reason,
      );
    }
    if (accepted.reason === "wrong_user") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This invite is for a different User",
      });
    }
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Lookup invite is not available",
    });
  }

  return {
    communityId: community.id,
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
    });
  });
