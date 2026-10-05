import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { acceptLink, throwInviteFrozen } from "#src/invites/doors";

type DbClient = typeof db;

export async function acceptInviteLink(
  database: DbClient,
  args: { token: string; userId: string },
) {
  const accepted = await acceptLink(database, "group", {
    token: args.token,
    userId: args.userId,
  });
  if (!accepted.ok) {
    if (accepted.reason === "already_member") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You are already a member of this Group",
      });
    }
    if (accepted.reason === "frozen") {
      throwInviteFrozen({ kind: "group", id: "" }, "accept", "frozen");
    }
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invite link is not available",
    });
  }

  return {
    groupId: accepted.hostId,
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
