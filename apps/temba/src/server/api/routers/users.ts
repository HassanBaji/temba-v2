import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { home } from "~/server/home/home";

export const usersRouter = createTRPCRouter({
  home: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return home(ctx.db, { userId: appUser.id });
  }),
});
