import { createTRPCRouter } from "#src/trpc";

import { decideLevelDisputeProcedure as decideLevelDispute } from "./decideLevelDispute";
import { disputeLevelProcedure as disputeLevel } from "./disputeLevel";
import { historyProcedure as history } from "./history";
import { listForOperatorProcedure as listForOperator } from "./listForOperator";
import { listLevelDisputesForOperatorProcedure as listLevelDisputesForOperator } from "./listLevelDisputesForOperator";
import { me } from "./me";
import { myGroupLevels } from "./myGroupLevels";
import { myGroupTiersProcedure as myGroupTiers } from "./myGroupTiers";
import { selfDeclare } from "./selfDeclare";
import { setGroupLevel } from "./setGroupLevel";
import { setLevel } from "./setLevel";
import { setLevelAsOperatorProcedure as setLevelAsOperator } from "./setLevelAsOperator";
import { setLevelAsVerifierProcedure as setLevelAsVerifier } from "./setLevelAsVerifier";

export const ratingsRouter = createTRPCRouter({
  decideLevelDispute,
  disputeLevel,
  history,
  listForOperator,
  listLevelDisputesForOperator,
  me,
  myGroupLevels,
  myGroupTiers,
  selfDeclare,
  setGroupLevel,
  setLevel,
  setLevelAsOperator,
  setLevelAsVerifier,
});
