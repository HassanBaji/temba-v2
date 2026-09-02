import { eq } from "drizzle-orm";

import { venues } from "@repo/db";

import {
  gameInviteOpenGraphMetadata,
  GENERIC_TEMBA_OPEN_GRAPH,
  occupiedFriendlyPositions,
} from "~/lib/game-invite-open-graph";
import { type db } from "~/server/db";
import { requireGame } from "~/server/games/access";
import { isIndividualSeatGame, listGameSides } from "~/server/games/seats";
import {
  findGameInviteLinkByShortCode,
  previewLink,
  type InviteDb,
} from "~/server/invites/doors";
import { isInviteLinkLive } from "~/server/invites/invite-link-expiry";

function writeDb(database: InviteDb): typeof db {
  return database as typeof db;
}

export async function loadGameInviteOpenGraph(
  database: InviteDb,
  rawCode: string,
) {
  const link = await findGameInviteLinkByShortCode(database, rawCode);
  if (!link || !isInviteLinkLive(link.expiresAt)) {
    return GENERIC_TEMBA_OPEN_GRAPH;
  }
  const previewed = await previewLink(database, "game", link.token);
  if (previewed.status !== "ready") {
    return GENERIC_TEMBA_OPEN_GRAPH;
  }
  const game = await requireGame(writeDb(database), link.gameId);
  if (game.cancelledAt) {
    return GENERIC_TEMBA_OPEN_GRAPH;
  }
  const venue = game.venueId
    ? await database.query.venues.findFirst({
        where: eq(venues.id, game.venueId),
        columns: { name: true },
      })
    : null;
  if (!venue) {
    return GENERIC_TEMBA_OPEN_GRAPH;
  }
  const sides = isIndividualSeatGame(game)
    ? await listGameSides(writeDb(database), game)
    : [];
  return gameInviteOpenGraphMetadata({
    venueName: venue.name,
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    format: game.format,
    registrationMode: game.registrationMode,
    occupiedCount: occupiedFriendlyPositions(sides),
    levelMinTenths: game.levelMinTenths,
    levelMaxTenths: game.levelMaxTenths,
  });
}
