import { createTRPCRouter } from "#src/trpc";

import { byIdProcedure as byId } from "./byId";
import { listMineProcedure as listMine } from "./listMine";
import { listOpenProcedure as listOpen } from "./listOpen";
import { listPostOptionsProcedure as listPostOptions } from "./listPostOptions";
import { postProcedure as post } from "./post";
import { withdrawProcedure as withdraw } from "./withdraw";

export const challengesRouter = createTRPCRouter({
  listMine,
  listOpen,
  byId,
  listPostOptions,
  post,
  withdraw,
});
