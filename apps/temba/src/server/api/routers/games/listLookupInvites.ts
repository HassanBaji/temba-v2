import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { listLookup } from "~/server/invites/doors";

type DbClient = typeof db;

export async function listLookupInvites(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  return listLookup(database, { kind: "game", id: game.id });
}

export const listLookupInvitesProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listLookupInvites(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
    });
  });
