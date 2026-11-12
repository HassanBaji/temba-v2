import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { listMyGamesHubRows } from "#src/games/list-my-games";

/**
 * Games hub My Games: live upcoming Games on Groups the signed-in User
 * belongs to (including Soft-archived Club Group Games), plus private
 * Games they created or are registered/waitlisted on. `groupTournaments`
 * keeps a posted Groups only tournament as one row (ADR-0074).
 */
export const listMyGames = protectedProcedure
  .input(z.object({ groupTournaments: z.boolean().optional() }).optional())
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listMyGamesHubRows(ctx.db, appUser.id, new Date(), ctx.locale, {
      groupTournaments: input?.groupTournaments,
    });
  });
