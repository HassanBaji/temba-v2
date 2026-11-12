import { createTRPCRouter } from "#src/trpc";

import { listForOperatorProcedure as listForOperator } from "./listForOperator";
import { me } from "./me";
import { myGroupLevels } from "./myGroupLevels";
import { selfDeclare } from "./selfDeclare";
import { setGroupLevel } from "./setGroupLevel";
import { setLevel } from "./setLevel";
import { setLevelAsOperatorProcedure as setLevelAsOperator } from "./setLevelAsOperator";
import { setLevelAsVerifierProcedure as setLevelAsVerifier } from "./setLevelAsVerifier";

export const ratingsRouter = createTRPCRouter({
  listForOperator,
  me,
  myGroupLevels,
  selfDeclare,
  setGroupLevel,
  setLevel,
  setLevelAsOperator,
  setLevelAsVerifier,
});
