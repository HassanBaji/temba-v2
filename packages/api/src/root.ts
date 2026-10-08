import { communitiesRouter } from "#src/routers/communities";
import { gamesRouter } from "#src/routers/games";
import { groupsRouter } from "#src/routers/groups";
import { ratingsRouter } from "#src/routers/ratings";
import { teamsRouter } from "#src/routers/teams";
import { usersRouter } from "#src/routers/users";
import { venuesRouter } from "#src/routers/venues";
import { createCallerFactory, createTRPCRouter } from "#src/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  communities: communitiesRouter,
  games: gamesRouter,
  groups: groupsRouter,
  ratings: ratingsRouter,
  teams: teamsRouter,
  users: usersRouter,
  venues: venuesRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
