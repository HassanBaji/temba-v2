import { z } from "zod";

import { publicProcedure } from "#src/trpc";

export const hello = publicProcedure
  .input(z.object({ text: z.string() }))
  .query(({ input }) => {
    return {
      greeting: `Hello ${input.text}`,
    };
  });
