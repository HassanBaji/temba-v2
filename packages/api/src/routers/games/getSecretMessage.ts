import { protectedProcedure } from "#src/trpc";

export const getSecretMessage = protectedProcedure.query(() => {
  return "you can now see this secret message!";
});
