import { createTRPCRouter } from "#src/trpc";

import { byIdProcedure as byId } from "./byId";
import { changeProposalProcedure as changeProposal } from "./changeProposal";
import { declineProposalProcedure as declineProposal } from "./declineProposal";
import { listMineProcedure as listMine } from "./listMine";
import { listOpenProcedure as listOpen } from "./listOpen";
import { listPostOptionsProcedure as listPostOptions } from "./listPostOptions";
import { listProposeOptionsProcedure as listProposeOptions } from "./listProposeOptions";
import { postProcedure as post } from "./post";
import { proposeProcedure as propose } from "./propose";
import { withdrawProcedure as withdraw } from "./withdraw";
import { withdrawProposalProcedure as withdrawProposal } from "./withdrawProposal";

export const challengesRouter = createTRPCRouter({
  listMine,
  listOpen,
  byId,
  listPostOptions,
  listProposeOptions,
  post,
  withdraw,
  propose,
  changeProposal,
  withdrawProposal,
  declineProposal,
});
