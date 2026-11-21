import { createTRPCRouter } from "#src/trpc";

import { attachOptionsProcedure as attachOptions } from "./attachOptions";
import { byIdProcedure as byId } from "./byId";
import { createProcedure as create } from "./create";
import { editionProcedure as edition } from "./edition";
import { endProcedure as end } from "./end";
import { forPlayerProcedure as forPlayer } from "./forPlayer";
import { listForGroupProcedure as listForGroup } from "./listForGroup";
import { playerWinsProcedure as playerWins } from "./playerWins";

export const seriesRouter = createTRPCRouter({
  attachOptions,
  byId,
  create,
  edition,
  end,
  forPlayer,
  listForGroup,
  playerWins,
});
