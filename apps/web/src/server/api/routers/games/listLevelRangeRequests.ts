import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  gameLevelRangeRequests,
  GameLevelRangeRequestStatusEnum,
  ratings,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { displayedLevelTenthsForUser } from "~/server/games/user-allowed-by-level-range";
import { isProvisional } from "~/server/ratings/level";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function listLevelRangeRequests(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);

  const rows = await database.query.gameLevelRangeRequests.findMany({
    where: and(
      eq(gameLevelRangeRequests.gameId, game.id),
      eq(
        gameLevelRangeRequests.status,
        GameLevelRangeRequestStatusEnum.PENDING,
      ),
    ),
    with: {
      user: { columns: { id: true, name: true, image: true } },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });

  return Promise.all(
    rows.map(async (row) => {
      const tenths = await displayedLevelTenthsForUser(
        database,
        row.userId,
        game.sport,
      );
      const ratingSport = game.sport === "football" ? "football" : "padel";
      const rating = await database.query.ratings.findFirst({
        where: and(
          eq(ratings.userId, row.userId),
          eq(ratings.sport, ratingSport),
        ),
        columns: { phi: true },
      });
      return {
        id: row.id,
        createdAt: row.createdAt,
        user: {
          id: row.user.id,
          name: row.user.name,
          image: row.user.image,
        },
        levelTenths: tenths,
        provisional: rating ? isProvisional(rating.phi) : false,
      };
    }),
  );
}

export const listLevelRangeRequestsProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listLevelRangeRequests(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
    });
  });
