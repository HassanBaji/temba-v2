import { createTRPCRouter } from "#src/trpc";

import { listForOperatorProcedure as listForOperator } from "./listForOperator";
import { me } from "./me";
import { selfDeclare } from "./selfDeclare";
import { setLevel } from "./setLevel";
import { setLevelAsOperatorProcedure as setLevelAsOperator } from "./setLevelAsOperator";

export const ratingsRouter = createTRPCRouter({
  listForOperator,
  me,
  selfDeclare,
  setLevel,
  setLevelAsOperator,
});
