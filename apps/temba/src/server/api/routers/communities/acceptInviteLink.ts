import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { acceptLink, throwInviteFrozen } from "~/server/invites/doors";

type DbClient = typeof db;

export async function acceptInviteLink(
  database: DbClient,
  args: { token: string; userId: string },
) {
  const accepted = await acceptLink(database, "community", {
    token: args.token,
    userId: args.userId,
  });
  if (!accepted.ok) {
    if (accepted.reason === "frozen") {
      throwInviteFrozen({ kind: "community", id: "" }, "accept", "frozen");
    }
    if (accepted.reason === "already_member") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You are already a Member of this Community",
      });
    }
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invite link is not available",
    });
  }

  return {
    communityId: accepted.hostId,
    alreadyMember: accepted.alreadyMember,
  };
}

export const acceptInviteLinkProcedure = protectedProcedure
  .input(z.object({ token: z.string().min(1).max(64) }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return acceptInviteLink(ctx.db, {
      token: input.token,
      userId: appUser.id,
    });
  });
