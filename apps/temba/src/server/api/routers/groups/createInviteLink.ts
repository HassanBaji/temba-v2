import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requireGroupInviteLinkMinter } from "~/server/groups/helpers/require-group-invite-link-minter";
import { mintLink } from "~/server/invites/doors";
import { getAppOrigin, groupInviteLinkUrl } from "~/server/invites/tokens";

type DbClient = typeof db;

export async function createInviteLink(
  database: DbClient,
  args: { groupId: string; userId: string; origin: string },
) {
  const group = await requireGroupInviteLinkMinter(
    database,
    args.groupId,
    args.userId,
  );

  const minted = await mintLink(
    database,
    { kind: "group", id: group.id },
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
    inviteUrl: groupInviteLinkUrl(args.origin, minted.link.token),
    createdAt: minted.link.createdAt,
    expiresAt: minted.link.expiresAt,
  };
}

export const createInviteLinkProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createInviteLink(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
      origin: getAppOrigin(ctx.headers),
    });
  });
