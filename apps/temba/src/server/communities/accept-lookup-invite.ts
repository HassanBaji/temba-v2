import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { communityMemberInvites } from "@repo/db";

import { requireCommunity } from "~/server/communities/helpers/require-community";
import { acceptLookup, throwInviteFrozen } from "~/server/invites/doors";
import { type db } from "~/server/db";

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
