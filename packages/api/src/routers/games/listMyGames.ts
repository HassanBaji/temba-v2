import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { listMyGamesHubRows } from "#src/games/list-my-games";

/**
 * Games hub My Games: live upcoming Games on Groups the signed-in User
 * belongs to (including Soft-archived Club Group Games), plus private
 * Games they created or are registered/waitlisted on.
 */
export const listMyGames = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return listMyGamesHubRows(ctx.db, appUser.id);
});
