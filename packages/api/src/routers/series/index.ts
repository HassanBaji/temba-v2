import { createTRPCRouter } from "#src/trpc";

import { attachOptionsProcedure as attachOptions } from "./attachOptions";
import { byIdProcedure as byId } from "./byId";
import { createProcedure as create } from "./create";
import { endProcedure as end } from "./end";
import { listForGroupProcedure as listForGroup } from "./listForGroup";

export const seriesRouter = createTRPCRouter({
  attachOptions,
  byId,
  create,
  end,
  listForGroup,
});
