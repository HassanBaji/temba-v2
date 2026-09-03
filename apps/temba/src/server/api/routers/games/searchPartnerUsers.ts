import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requireGame } from "~/server/games/access";
import { assertCanRegisterWithPartner } from "~/server/games/helpers/assert-can-register-with-partner";
import { gameHideRegisteredWaitlistedSelf } from "~/server/games/helpers/game-hide-registered-waitlisted-self";
import { searchUsersForGamePicker } from "~/server/games/helpers/search-users-for-game-picker";

type DbClient = typeof db;

export async function searchPartnerUsers(
  database: DbClient,
  args: { gameId: string; userId: string; query: string },
) {
  const game = await requireGame(database, args.gameId);
  const now = new Date();
  await assertCanRegisterWithPartner(database, game, args.userId, now);

  const excludeUserIds = await gameHideRegisteredWaitlistedSelf(
    database,
    game.id,
    args.userId,
  );

  // Groupless non-public: only the organizer passes the join gate, and
  // the organizer is already excluded as self.
  if (!game.isPublic && !game.groupId) {
    return [];
  }

  return searchUsersForGamePicker(database, game, {
    query: args.query,
    excludeUserIds,
  });
}

export const searchPartnerUsersProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      query: z.string().trim().max(255),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return searchPartnerUsers(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      query: input.query,
    });
  });
