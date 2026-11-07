import { createTRPCRouter } from "#src/trpc";

import { castMvpVoteProcedure as castMvpVote } from "./castMvpVote";
import { forGameProcedure as forGame } from "./forGame";
import { giveProcedure as give } from "./give";
import { retractProcedure as retract } from "./retract";
import { setMvpProcedure as setMvp } from "./setMvp";
import { setMvpModeProcedure as setMvpMode } from "./setMvpMode";

export const marksRouter = createTRPCRouter({
  forGame,
  give,
  retract,
  castMvpVote,
  setMvp,
  setMvpMode,
});
