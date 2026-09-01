import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { getLiveLink } from "~/server/invites/doors";
import {
  gameInviteLinkUrl,
  gameInviteShortUrl,
} from "~/server/invites/tokens";
import { type db } from "~/server/db";

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
