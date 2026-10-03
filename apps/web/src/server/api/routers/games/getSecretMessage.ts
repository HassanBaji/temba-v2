import { protectedProcedure } from "~/server/api/trpc";

export const getSecretMessage = protectedProcedure.query(() => {
  return "you can now see this secret message!";
});
