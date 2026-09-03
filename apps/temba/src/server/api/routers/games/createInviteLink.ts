import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { assertGameInviteDoorsOpen } from "~/server/games/invites";
import { mintLink } from "~/server/invites/doors";
import {
  gameInviteLinkUrl,
  gameInviteShortUrl,
  getAppOrigin,
} from "~/server/invites/tokens";

type DbClient = typeof db;

export async function createInviteLink(
  database: DbClient,
  args: { gameId: string; userId: string; origin: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  await assertGameInviteDoorsOpen(database, game);
  const minted = await mintLink(
    database,
    { kind: "game", id: game.id },
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
    inviteUrl: gameInviteLinkUrl(args.origin, minted.link.token),
    shortUrl: minted.link.shortCode
      ? gameInviteShortUrl(args.origin, minted.link.shortCode)
      : null,
    createdAt: minted.link.createdAt,
    expiresAt: minted.link.expiresAt,
  };
}

export const createInviteLinkProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createInviteLink(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      origin: getAppOrigin(ctx.headers),
    });
  });
