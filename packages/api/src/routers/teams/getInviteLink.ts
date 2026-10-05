import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { getLiveLink } from "#src/invites/doors";
import { teamInviteLinkUrl } from "#src/invites/tokens";
import { requireIncompleteTeamCreator } from "#src/teams/helpers/require-incomplete-team-creator";

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
      origin: ctx.webOrigin,
    });
  });
