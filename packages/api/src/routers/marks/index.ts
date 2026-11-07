import { createTRPCRouter } from "#src/trpc";

import { forGameProcedure as forGame } from "./forGame";
import { giveProcedure as give } from "./give";
import { retractProcedure as retract } from "./retract";

export const marksRouter = createTRPCRouter({
  forGame,
  give,
  retract,
});
