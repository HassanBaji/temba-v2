import { TRPCError } from "@trpc/server";

import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { assertGameInviteDoorsOpen } from "~/server/games/invites";
import { mintLink } from "~/server/invites/doors";
import { gameInviteLinkUrl, gameInviteShortUrl } from "~/server/invites/tokens";
import { type db } from "~/server/db";

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
