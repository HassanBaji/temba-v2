import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { listMyGamesHubRows } from "~/server/games/list-my-games";

/**
 * Games hub My Games: live upcoming Games on Groups the signed-in User
 * belongs to (including Soft-archived Club Group Games), plus private
 * Games they created or are registered/waitlisted on.
 */
export const listMyGames = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return listMyGamesHubRows(ctx.db, appUser.id);
});
