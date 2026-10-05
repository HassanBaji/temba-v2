import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { requireLiveCommunity } from "#src/communities/helpers/require-live-community";
import { requireStaff } from "#src/communities/helpers/require-staff";
import { type db } from "#src/db";
import { mintLink, throwInviteFrozen } from "#src/invites/doors";
import { communityInviteLinkUrl } from "#src/invites/tokens";

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
      origin: ctx.webOrigin,
    });
  });
