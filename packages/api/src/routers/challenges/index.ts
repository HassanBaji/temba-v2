import { createTRPCRouter } from "#src/trpc";

import { listMineProcedure as listMine } from "./listMine";

export const challengesRouter = createTRPCRouter({
  listMine,
});
