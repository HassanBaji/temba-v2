import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { requireLiveCommunity } from "#src/communities/helpers/require-live-community";
import { requireStaff } from "#src/communities/helpers/require-staff";
import { type db } from "#src/db";
import { getLiveLink } from "#src/invites/doors";
import { communityInviteLinkUrl } from "#src/invites/tokens";

type DbClient = typeof db;

export async function getInviteLink(
  database: DbClient,
  args: { communityId: string; userId: string; origin: string },
) {
  const community = await requireLiveCommunity(database, args.communityId);
  await requireStaff(database, community.id, args.userId);

  const newest = await getLiveLink(database, {
    kind: "community",
    id: community.id,
  });

  if (!newest) {
    return null;
  }

  return {
    id: newest.id,
    inviteUrl: communityInviteLinkUrl(args.origin, newest.token),
    createdAt: newest.createdAt,
    expiresAt: newest.expiresAt,
  };
}

export const getInviteLinkProcedure = protectedProcedure
  .input(z.object({ communityId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return getInviteLink(ctx.db, {
      communityId: input.communityId,
      userId: appUser.id,
      origin: ctx.webOrigin,
    });
  });
