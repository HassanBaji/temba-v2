import { createTRPCRouter } from "~/server/api/trpc";

import { home } from "./home";

export const usersRouter = createTRPCRouter({
  home,
});
