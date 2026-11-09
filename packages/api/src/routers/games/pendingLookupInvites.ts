import { and, eq, inArray, isNull } from "drizzle-orm";

import { gameMemberInvites, games } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { getRegistrationStatus, requireGame } from "#src/games/access";
import {
  isIndividualSeatGame,
  listGameSides,
  vacantPositionsFromSides,
} from "#src/games/seats";

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
      inArray(
        gameMemberInvites.gameId,
        database
          .select({ id: games.id })
          .from(games)
          .where(isNull(games.cancelledAt)),
      ),
    ),
    with: {
      game: {
        columns: { id: true, name: true },
      },
      invitedBy: {
        columns: { id: true, name: true, image: true },
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
      game: {
        name: game.name,
        hasCustomName: game.hasCustomName,
        format: game.format,
        windowStart: game.windowStart,
        windowEnd: game.windowEnd,
      },
      invitedBy: {
        id: row.invitedBy.id,
        name: row.invitedBy.name,
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

export const pendingLookupInvitesProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return pendingLookupInvites(ctx.db, { userId: appUser.id });
  },
);
