import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { getLiveLink } from "~/server/invites/doors";
import {
  gameInviteLinkUrl,
  gameInviteShortUrl,
  getAppOrigin,
} from "~/server/invites/tokens";

type DbClient = typeof db;

export async function getInviteLink(
  database: DbClient,
  args: { gameId: string; userId: string; origin: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  const newest = await getLiveLink(database, { kind: "game", id: game.id });
  if (!newest) {
    return null;
  }
  return {
    id: newest.id,
    inviteUrl: gameInviteLinkUrl(args.origin, newest.token),
    shortUrl:
      "shortCode" in newest && newest.shortCode
        ? gameInviteShortUrl(args.origin, newest.shortCode)
        : null,
    createdAt: newest.createdAt,
    expiresAt: newest.expiresAt,
  };
}

export const getInviteLinkProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return getInviteLink(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      origin: getAppOrigin(ctx.headers),
    });
  });
