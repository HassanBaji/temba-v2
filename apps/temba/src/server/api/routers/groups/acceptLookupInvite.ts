import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groupMemberInvites } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requireGroup } from "~/server/groups/helpers/require-group";
import { acceptLookup, throwInviteFrozen } from "~/server/invites/doors";

type DbClient = typeof db;

export async function acceptLookupInvite(
  database: DbClient,
  args: { inviteId: string; userId: string },
) {
  const invite = await database.query.groupMemberInvites.findFirst({
    where: eq(groupMemberInvites.id, args.inviteId),
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

  const group = await requireGroup(database, invite.groupId);
  const accepted = await acceptLookup(
    database,
    { kind: "group", id: group.id },
    { inviteId: invite.id, userId: args.userId },
  );
  if (!accepted.ok) {
    if (accepted.reason === "must_be_member") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be a Community Member to join its Club Groups",
      });
    }
    if (accepted.reason === "frozen") {
      throwInviteFrozen({ kind: "group", id: group.id }, "accept", "frozen");
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
    });
  });
