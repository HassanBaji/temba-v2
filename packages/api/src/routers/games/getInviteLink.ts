import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { getLiveLink } from "#src/invites/doors";
import { gameInviteLinkUrl, gameInviteShortUrl } from "#src/invites/tokens";

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
      origin: ctx.webOrigin,
    });
  });
