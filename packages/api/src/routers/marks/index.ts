import { createTRPCRouter } from "#src/trpc";

import { cabinetProcedure as cabinet } from "./cabinet";
import { castMvpVoteProcedure as castMvpVote } from "./castMvpVote";
import { forGameProcedure as forGame } from "./forGame";
import { giveProcedure as give } from "./give";
import { kindDetailProcedure as kindDetail } from "./kindDetail";
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
  cabinet,
  kindDetail,
});
