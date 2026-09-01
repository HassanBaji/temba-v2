import { TRPCError } from "@trpc/server";

import { mintLink } from "~/server/invites/doors";
import { teamInviteLinkUrl } from "~/server/invites/tokens";
import { requireIncompleteTeamCreator } from "~/server/teams/helpers/require-incomplete-team-creator";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function createInviteLink(
  database: DbClient,
  args: { teamId: string; userId: string; origin: string },
) {
  const { team } = await requireIncompleteTeamCreator(
    database,
    args.teamId,
    args.userId,
  );

  const minted = await mintLink(
    database,
    { kind: "team", id: team.id },
    { createdBy: args.userId },
  );
  if (!minted.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Invite link",
    });
  }

  return {
    id: minted.link.id,
    inviteUrl: teamInviteLinkUrl(args.origin, minted.link.token),
    createdAt: minted.link.createdAt,
    expiresAt: minted.link.expiresAt,
  };
}
