import { TRPCError } from "@trpc/server";

import { acceptLink, throwInviteFrozen } from "~/server/invites/doors";
import { type db } from "~/server/db";

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
