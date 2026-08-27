import { communitiesRouter } from "~/server/api/routers/communities";
import { gamesRouter } from "~/server/api/routers/games";
import { groupsRouter } from "~/server/api/routers/groups";
import { teamsRouter } from "~/server/api/routers/teams";
import { usersRouter } from "~/server/api/routers/users";
import { venuesRouter } from "~/server/api/routers/venues";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  communities: communitiesRouter,
  games: gamesRouter,
  groups: groupsRouter,
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
