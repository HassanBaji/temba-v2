import type { DbClient, DbTx } from "@repo/db";
import { and, asc, eq, isNull } from "drizzle-orm";

import {
  gameCourts,
  gamePlayers,
  groupMembers,
  groups,
  user,
  venues,
} from "@repo/db";

import type { GameInviteHero } from "@repo/domain/game-invite-hero";

import { type GameRow } from "#src/games/access";
import { isIndividualSeatGame, sideCount } from "#src/games/seats";

type DbOrTx = DbClient | DbTx;

const MEMBER_NAME_COUNT = 4;

function seatCountOf(game: GameRow) {
  if (isIndividualSeatGame(game)) {
    return sideCount(game) * 2;
  }
  return game.playersAllowed ?? null;
}

async function nameOf(database: DbOrTx, userId: string | null) {
  if (!userId) {
    return null;
  }
  const row = await database.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { name: true },
  });
  return row?.name ?? null;
}

async function groupCardOf(database: DbOrTx, groupId: string | null) {
  if (!groupId) {
    return null;
  }
  const group = await database.query.groups.findFirst({
    where: and(eq(groups.id, groupId), isNull(groups.deletedAt)),
    columns: { id: true, name: true, sport: true, imageUrl: true },
  });
  if (!group) {
    return null;
  }
  const members = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, group.id),
    columns: { id: true },
    with: { user: { columns: { name: true } } },
    orderBy: asc(groupMembers.createdAt),
  });
  return {
    ...group,
    memberCount: members.length,
    memberNames: members
      .slice(0, MEMBER_NAME_COUNT)
      .flatMap((row) => (row.user?.name ? [row.user.name] : [])),
  };
}

/**
 * What a Game Invite link shows before anyone joins: when and where, who is
 * in, and who organizes and shared it. The link is the capability, so a
 * signed-out holder sees it too.
 */
export async function gameInviteLinkHero(
  database: DbOrTx,
  args: {
    game: GameRow;
    sharedByUserId: string;
    linkExpiresAt: Date | null;
    viewerUserId?: string;
  },
): Promise<GameInviteHero> {
  const { game } = args;
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, game.venueId),
    columns: { name: true, city: true },
  });
  const courtRows = await database.query.gameCourts.findMany({
    where: eq(gameCourts.gameId, game.id),
    with: { court: { columns: { name: true } } },
  });
  const courtName =
    courtRows
      .flatMap((row) => (row.court ? [row.court.name] : []))
      .sort((left, right) => left.localeCompare(right))[0] ?? null;
  const roster = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, game.id),
    columns: { userId: true },
    with: { user: { columns: { name: true } } },
    orderBy: asc(gamePlayers.createdAt),
  });
  return {
    sport: game.sport,
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    cancelledAt: game.cancelledAt,
    venueName: venue?.name ?? null,
    venueCity: venue?.city ?? null,
    courtName,
    sideSize: game.sideSize,
    seatCount: seatCountOf(game),
    players: roster.map((row) => ({
      name: row.user?.name ?? null,
      isViewer: args.viewerUserId != null && row.userId === args.viewerUserId,
    })),
    pricePerPlayerFils: game.pricePerPlayerFils,
    rated: game.rated,
    organizerName: await nameOf(database, game.createdBy),
    sharedByName: await nameOf(database, args.sharedByUserId),
    linkExpiresAt: args.linkExpiresAt,
    groupCard: await groupCardOf(database, game.groupId),
  };
}
