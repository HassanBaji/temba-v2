import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { mintLink } from "~/server/invites/doors";
import { getAppOrigin, teamInviteLinkUrl } from "~/server/invites/tokens";
import { requireIncompleteTeamCreator } from "~/server/teams/helpers/require-incomplete-team-creator";

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

export const createInviteLinkProcedure = protectedProcedure
  .input(z.object({ teamId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createInviteLink(ctx.db, {
      teamId: input.teamId,
      userId: appUser.id,
      origin: getAppOrigin(ctx.headers),
    });
  });
