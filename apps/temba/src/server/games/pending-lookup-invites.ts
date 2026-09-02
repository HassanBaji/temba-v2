import { and, eq, isNull } from "drizzle-orm";

import { gameMemberInvites } from "@repo/db";

import { getRegistrationStatus, requireGame } from "~/server/games/access";
import {
  isIndividualSeatGame,
  listGameSides,
  vacantPositionsFromSides,
} from "~/server/games/seats";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function pendingLookupInvites(
  database: DbClient,
  args: { userId: string },
) {
  const rows = await database.query.gameMemberInvites.findMany({
    where: and(
      eq(gameMemberInvites.userId, args.userId),
      isNull(gameMemberInvites.acceptedAt),
      isNull(gameMemberInvites.revokedAt),
    ),
    with: {
      game: {
        columns: { id: true, name: true },
      },
      invitedBy: {
        columns: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
  const mapped = [];
  for (const row of rows) {
    const game = await requireGame(database, row.gameId);
    const needsSeatPick = isIndividualSeatGame(game);
    const sides = needsSeatPick ? await listGameSides(database, game) : [];
    mapped.push({
      id: row.id,
      gameId: row.gameId,
      gameName: row.game.name ?? "Untitled Game",
      invitedBy: {
        id: row.invitedBy.id,
        name: row.invitedBy.name,
        email: row.invitedBy.email,
        image: row.invitedBy.image,
      },
      createdAt: row.createdAt,
      needsSeatPick,
      format: game.format,
      registrationStatus: await getRegistrationStatus(
        database,
        game,
        new Date(),
      ),
      sides,
      vacantSeats: vacantPositionsFromSides(sides),
    });
  }
  return mapped;
}
