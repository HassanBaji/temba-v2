import { createTRPCRouter } from "#src/trpc";

import { createProcedure as create } from "./create";
import { endProcedure as end } from "./end";

export const seriesRouter = createTRPCRouter({
  create,
  end,
});
