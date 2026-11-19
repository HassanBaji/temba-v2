import { createTRPCRouter } from "#src/trpc";

import { connectProcedure as connect } from "./connect";
import { disconnectTvProcedure as disconnectTv } from "./disconnectTv";
import { forGameProcedure as forGame } from "./forGame";
import { setMessageProcedure as setMessage } from "./setMessage";
import { snapshotProcedure as snapshot } from "./snapshot";
import { startProcedure as start } from "./start";
import { stopProcedure as stop } from "./stop";
import { updateProcedure as update } from "./update";

export const liveBoardsRouter = createTRPCRouter({
  connect,
  disconnectTv,
  forGame,
  setMessage,
  snapshot,
  start,
  stop,
  update,
});
