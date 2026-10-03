import { z } from "zod";

import { publicProcedure } from "~/server/api/trpc";

export const hello = publicProcedure
  .input(z.object({ text: z.string() }))
  .query(({ input }) => {
    return {
      greeting: `Hello ${input.text}`,
    };
  });
