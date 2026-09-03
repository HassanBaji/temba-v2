import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { requireLiveCommunity } from "~/server/communities/helpers/require-live-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { type db } from "~/server/db";
import { mintLink, throwInviteFrozen } from "~/server/invites/doors";
import { communityInviteLinkUrl, getAppOrigin } from "~/server/invites/tokens";

type DbClient = typeof db;

export async function createInviteLink(
  database: DbClient,
  args: { communityId: string; userId: string; origin: string },
) {
  const community = await requireLiveCommunity(database, args.communityId);
  await requireStaff(database, community.id, args.userId);

  const minted = await mintLink(
    database,
    { kind: "community", id: community.id },
    { createdBy: args.userId },
  );
  if (!minted.ok) {
    throwInviteFrozen(
      { kind: "community", id: community.id },
      "mint",
      minted.reason === "frozen" ? "frozen" : "not_found",
    );
  }

  return {
    id: minted.link.id,
    inviteUrl: communityInviteLinkUrl(args.origin, minted.link.token),
    createdAt: minted.link.createdAt,
    expiresAt: minted.link.expiresAt,
  };
}

export const createInviteLinkProcedure = protectedProcedure
  .input(z.object({ communityId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createInviteLink(ctx.db, {
      communityId: input.communityId,
      userId: appUser.id,
      origin: getAppOrigin(ctx.headers),
    });
  });
