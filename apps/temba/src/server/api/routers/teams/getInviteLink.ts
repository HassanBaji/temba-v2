import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { getLiveLink } from "~/server/invites/doors";
import { getAppOrigin, teamInviteLinkUrl } from "~/server/invites/tokens";
import { requireIncompleteTeamCreator } from "~/server/teams/helpers/require-incomplete-team-creator";

type DbClient = typeof db;

export async function getInviteLink(
  database: DbClient,
  args: { teamId: string; userId: string; origin: string },
) {
  await requireIncompleteTeamCreator(database, args.teamId, args.userId);

  const newest = await getLiveLink(database, {
    kind: "team",
    id: args.teamId,
  });
  if (!newest) {
    return null;
  }

  return {
    id: newest.id,
    inviteUrl: teamInviteLinkUrl(args.origin, newest.token),
    createdAt: newest.createdAt,
    expiresAt: newest.expiresAt,
  };
}

export const getInviteLinkProcedure = protectedProcedure
  .input(z.object({ teamId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return getInviteLink(ctx.db, {
      teamId: input.teamId,
      userId: appUser.id,
      origin: getAppOrigin(ctx.headers),
    });
  });
