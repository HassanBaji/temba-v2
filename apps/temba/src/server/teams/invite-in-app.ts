import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { user } from "@repo/db";

import { mintLookup } from "~/server/invites/doors";
import { requireIncompleteTeamCreator } from "~/server/teams/helpers/require-incomplete-team-creator";
import { unorderedPairIsReserved } from "~/server/teams/helpers/unordered-pair-is-reserved";
import { unusedInviteForTeam } from "~/server/teams/helpers/unused-invite-for-team";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function inviteInApp(
  database: DbClient,
  args: { teamId: string; userId: string; inviteeUserId: string },
) {
  const { team, memberRows } = await requireIncompleteTeamCreator(
    database,
    args.teamId,
    args.userId,
  );

  const invitee = await database.query.user.findFirst({
    where: eq(user.id, args.inviteeUserId),
    columns: {
      id: true,
      name: true,
    },
  });

  if (!invitee) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "User not found",
    });
  }

  if (invitee.id === args.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You cannot invite yourself",
    });
  }

  const alreadyMember = memberRows.some((row) => row.userId === invitee.id);
  if (alreadyMember) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "User is already a member of this Team",
    });
  }

  const unusedLookup = await unusedInviteForTeam(database, team.id);
  if (unusedLookup) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        unusedLookup.userId === invitee.id
          ? "An unused Lookup invite already exists for this User"
          : "Revoke the unused invite before sending a new one",
    });
  }

  if (await unorderedPairIsReserved(database, args.userId, invitee.id)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This pair already has a Team or a pending invite",
    });
  }

  const minted = await mintLookup(
    database,
    { kind: "team", id: team.id },
    { userId: invitee.id, invitedBy: args.userId },
  );
  if (!minted.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Team invite",
    });
  }

  return {
    id: minted.invite.id,
    teamId: minted.invite.hostId,
    userId: minted.invite.userId,
    createdAt: minted.invite.createdAt,
  };
}
