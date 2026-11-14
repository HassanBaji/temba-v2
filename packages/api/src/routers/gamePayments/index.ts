import { createTRPCRouter } from "#src/trpc";

import { claimProcedure as claim } from "./claim";
import { confirmAllProcedure as confirmAll } from "./confirmAll";
import { forGameProcedure as forGame } from "./forGame";
import { markNotReceivedProcedure as markNotReceived } from "./markNotReceived";
import { markPaidProcedure as markPaid } from "./markPaid";
import { remindProcedure as remind } from "./remind";
import { undoProcedure as undo } from "./undo";
import { unclaimProcedure as unclaim } from "./unclaim";

export const gamePaymentsRouter = createTRPCRouter({
  forGame,
  claim,
  unclaim,
  markPaid,
  markNotReceived,
  undo,
  confirmAll,
  remind,
});
