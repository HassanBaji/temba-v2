import { and, eq, isNull } from "drizzle-orm";

import { groups, venues } from "@repo/db";

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

function genericOpenGraph(locale: Locale) {
  return { ...genericTembaOpenGraph(locale), image: null };
}

export async function loadGameInviteOpenGraph(
  database: InviteDb,
  rawCode: string,
  locale: Locale,
) {
  return gameInviteLinkOpenGraph(
    database,
    await findGameInviteLinkByShortCode(database, rawCode),
    locale,
  );
}

export async function gameInviteLinkOpenGraph(
  database: InviteDb,
  link: { token: string; gameId: string } | undefined,
  locale: Locale,
) {
  if (!link) {
    return genericOpenGraph(locale);
  }
  const previewed = await previewLink(database, "game", link.token);
  if (previewed.status !== "ready") {
    return genericOpenGraph(locale);
  }
  const game = await requireGame(writeDb(database), link.gameId, locale);
  if (game.cancelledAt) {
    return genericOpenGraph(locale);
  }
  const venue = game.venueId
    ? await database.query.venues.findFirst({
        where: eq(venues.id, game.venueId),
        columns: { name: true },
      })
    : null;
  if (!venue) {
    return genericOpenGraph(locale);
  }
  const group = game.groupId
    ? await database.query.groups.findFirst({
        where: and(eq(groups.id, game.groupId), isNull(groups.deletedAt)),
        columns: { name: true, imageUrl: true },
      })
    : null;
  const sides = isIndividualSeatGame(game)
    ? await listGameSides(writeDb(database), game)
    : [];
  const metadata = gameInviteOpenGraphMetadata({
    venueName: venue.name,
    groupName: group?.name,
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    format: game.format,
    registrationMode: game.registrationMode,
    occupiedCount: occupiedFriendlyPositions(sides),
    levelMinTenths: game.levelMinTenths,
    levelMaxTenths: game.levelMaxTenths,
    locale,
  });
  return { ...metadata, image: group?.imageUrl ?? null };
}
