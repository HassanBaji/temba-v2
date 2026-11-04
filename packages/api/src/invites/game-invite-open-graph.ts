import { eq } from "drizzle-orm";

import { venues } from "@repo/db";

import {
  gameInviteOpenGraphMetadata,
  genericTembaOpenGraph,
  occupiedFriendlyPositions,
} from "@repo/domain/game-invite-open-graph";
import { type Locale } from "@repo/i18n/locale";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import { isIndividualSeatGame, listGameSides } from "#src/games/seats";
import {
  findGameInviteLinkByShortCode,
  previewLink,
  type InviteDb,
} from "#src/invites/doors";

function writeDb(database: InviteDb): typeof db {
  return database as typeof db;
}

export async function loadGameInviteOpenGraph(
  database: InviteDb,
  rawCode: string,
  locale: Locale,
) {
  const link = await findGameInviteLinkByShortCode(database, rawCode);
  if (!link) {
    return genericTembaOpenGraph(locale);
  }
  const previewed = await previewLink(database, "game", link.token);
  if (previewed.status !== "ready") {
    return genericTembaOpenGraph(locale);
  }
  const game = await requireGame(writeDb(database), link.gameId);
  if (game.cancelledAt) {
    return genericTembaOpenGraph(locale);
  }
  const venue = game.venueId
    ? await database.query.venues.findFirst({
        where: eq(venues.id, game.venueId),
        columns: { name: true },
      })
    : null;
  if (!venue) {
    return genericTembaOpenGraph(locale);
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
    locale,
  });
}
