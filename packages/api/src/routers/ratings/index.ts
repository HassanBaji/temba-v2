import { createTRPCRouter } from "#src/trpc";

import { me } from "./me";
import { selfDeclare } from "./selfDeclare";
import { setLevel } from "./setLevel";

export const ratingsRouter = createTRPCRouter({
  me,
  selfDeclare,
  setLevel,
});
