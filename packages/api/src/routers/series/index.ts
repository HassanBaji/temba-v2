import { createTRPCRouter } from "#src/trpc";

import { attachOptionsProcedure as attachOptions } from "./attachOptions";
import { createProcedure as create } from "./create";
import { endProcedure as end } from "./end";

export const seriesRouter = createTRPCRouter({
  attachOptions,
  create,
  end,
});
